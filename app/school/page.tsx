'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, GraduationCap,
  HelpCircle, Lightbulb, LoaderCircle, Maximize2, Mic, MicOff,
  PanelRightClose, PanelRightOpen, Play, Send, Sparkles, Volume2, VolumeX, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { bookPages, lessonPoints, type LessonPoint } from '@/lib/school/lesson';
import { guidedStages } from '@/lib/school/learning-content';
import { StageIllustration } from './StageIllustration';
import { ButterflySimulation } from './ButterflySimulation';
import '@fontsource/noto-sans-arabic/arabic-400.css';
import '@fontsource/noto-sans-arabic/arabic-700.css';
import './school.css';

const BOOK_DATA_URL = '/school/grade-4-science.base64.txt';
const START_PAGE = 73;

type ChatEntry = { from: 'teacher' | 'assistant'; text: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function say(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-IQ';
  utterance.rate = 0.88;
  const arabic = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('ar'));
  if (arabic) utterance.voice = arabic;
  window.speechSynthesis.speak(utterance);
}

export default function SchoolPage() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(START_PAGE);
  const [loadError, setLoadError] = useState('');
  const [viewerSize, setViewerSize] = useState({ width: 760, height: 680 });
  const [viewMode, setViewMode] = useState<'page' | 'width' | 'custom'>('page');
  const [customScale, setCustomScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 990 });
  const [rendering, setRendering] = useState(true);
  const [activePoint, setActivePoint] = useState<LessonPoint | null>(
    lessonPoints.find((point) => point.page === START_PAGE && point.number === 1) ?? null,
  );
  const [markersVisible, setMarkersVisible] = useState(true);
  const [chaptersOpen, setChaptersOpen] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [sideTab, setSideTab] = useState<'lesson' | 'activity' | 'assistant'>('lesson');
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [readerExpanded, setReaderExpanded] = useState(false);
  const [readerMode, setReaderMode] = useState<'book' | 'simulation'>('book');
  const [simulationStage, setSimulationStage] = useState(0);
  const [simulationDiscovered, setSimulationDiscovered] = useState(false);
  const [simulationAnswer, setSimulationAnswer] = useState<number | null>(null);
  const [sound, setSound] = useState(false);
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [assistantReady, setAssistantReady] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking');
  const [chat, setChat] = useState<ChatEntry[]>([{
    from: 'assistant',
    text: 'أهلاً يا أبطال! اختاروا إحدى العلامات المضيئة فوق الكتاب، أو اسألوني عن دورة حياة الفراشة والضفدع.',
  }]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentScaleRef = useRef(1);

  useEffect(() => {
    let active = true;
    let pdfDoc: PDFDocumentProxy | undefined;
    async function openBook() {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/school/pdf.worker.min.mjs';
        // Fetch text rather than a .pdf URL so browser download managers do not
        // hijack PDF.js. Decoding preserves every byte, glyph and page image.
        const response = await fetch(BOOK_DATA_URL);
        if (!response.ok) throw new Error(`Book asset request failed: ${response.status}`);
        const encoded = await response.text();
        const binary = atob(encoded.trim());
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        // This textbook embeds custom Arabic fonts whose CSS font-face rendering
        // breaks letter shaping. Use PDF.js' internal glyph renderer instead so
        // the original page typography stays intact across browsers.
        pdfDoc = await pdfjs.getDocument({
          data: bytes,
          disableFontFace: true,
          useSystemFonts: false,
        }).promise;
        if (active) setPdf(pdfDoc);
      } catch (error) {
        console.error('Failed to open the embedded science textbook:', error);
        if (active) setLoadError('تعذر فتح النسخة المدمجة من الكتاب. يرجى إعادة تشغيل خادم التطوير.');
      }
    }
    void openBook();
    return () => {
      active = false;
      if (pdfDoc) void pdfDoc.destroy();
    };
  }, []);

  useEffect(() => {
    if (!viewerRef.current) return;
    const node = viewerRef.current;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        setViewerSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [readerMode]);

  useEffect(() => {
    if (!pdf || readerMode !== 'book' || !canvasRef.current) return;
    let canceled = false;
    let task: RenderTask | undefined;
    const canvas = canvasRef.current;
    async function drawPage() {
      if (!pdf) return;
      setRendering(true);
      try {
        const sheet = await pdf.getPage(page);
        if (canceled) return;
        const native = sheet.getViewport({ scale: 1 });
        const fitWidth = Math.max(220, viewerSize.width - 34) / native.width;
        const fitHeight = Math.max(260, viewerSize.height - 40) / native.height;
        const scale = viewMode === 'page' ? Math.min(fitWidth, fitHeight) : viewMode === 'width' ? fitWidth : customScale;
        const viewport = sheet.getViewport({ scale });
        currentScaleRef.current = scale;
        setZoomPercent(Math.round(scale * 100));
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(viewport.width * ratio);
        canvas.height = Math.round(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        setCanvasSize({ width: viewport.width, height: viewport.height });
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        task = sheet.render({ canvasContext: ctx, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        await task.promise;
        if (!canceled) setRendering(false);
      } catch (error) {
        if (!canceled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setLoadError('تعذر عرض هذه الصفحة من الكتاب.');
          setRendering(false);
        }
      }
    }
    void drawPage();
    return () => {
      canceled = true;
      task?.cancel();
    };
  }, [pdf, page, viewerSize, viewMode, customScale, readerMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat]);

  const checkAssistant = useCallback(async () => {
    setAssistantReady('checking');
    try {
      const response = await fetch('/api/school/ask', { cache: 'no-store' });
      if (!response.ok) throw new Error('Status check failed');
      const status: { ready?: boolean } = await response.json();
      setAssistantReady(status.ready ? 'ready' : 'missing');
    } catch {
      setAssistantReady('error');
    }
  }, []);

  useEffect(() => {
    if (assistantOpen) void checkAssistant();
  }, [assistantOpen, checkAssistant]);

  const jump = useCallback((target: number) => {
    setPage(Math.max(1, Math.min(pdf?.numPages || 216, target)));
    setReaderMode('book');
    setActivePoint(null);
    setQuizChoice(null);
    setLoadError('');
  }, [pdf]);

  const choosePoint = (point: LessonPoint) => {
    setActivePoint(point);
    if (point.group === 'butterfly') setSimulationStage(point.number - 1);
    setAssistantOpen(true);
    setSideTab('lesson');
    setQuizChoice(null);
    if (sound) say(`${point.title}. ${point.description}`);
  };

  const changeZoom = (factor: number) => {
    setCustomScale(Math.max(0.3, Math.min(3, currentScaleRef.current * factor)));
    setViewMode('custom');
  };

  const chooseSimulationStage = useCallback((index: number) => {
    const point = lessonPoints.find((item) => item.group === 'butterfly' && item.number === index + 1);
    if (!point) return;
    setSimulationStage(index);
    setSimulationDiscovered(false);
    setSimulationAnswer(null);
    setActivePoint(point);
    setPage(point.page);
    setQuizChoice(null);
    setSideTab('lesson');
  }, []);

  const openSimulation = () => {
    const point = activePoint?.group === 'butterfly'
      ? activePoint
      : lessonPoints.find((item) => item.group === 'butterfly' && (page === 74 ? item.number === 4 : item.number === 1));
    if (point) chooseSimulationStage(point.number - 1);
    setReaderMode('simulation');
    setAssistantOpen(true);
    setSideTab('assistant');
  };

  const submitQuestion = async (event?: FormEvent, proposed?: string, speakReply = false) => {
    event?.preventDefault();
    const text = (proposed || question).trim();
    if (!text || asking || assistantReady !== 'ready') return;
    setQuestion('');
    setAsking(true);
    setAssistantOpen(true);
    setChat((items) => [...items, { from: 'teacher', text }]);
    try {
      const response = await fetch('/api/school/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          page,
          pointId: pointForLesson?.id,
          mode: readerMode,
          discoveryShown: readerMode === 'simulation' ? simulationDiscovered : false,
          quizChoice: readerMode === 'simulation' ? simulationAnswer : quizChoice,
          history: chat.slice(-6).map((item) => ({ role: item.from === 'teacher' ? 'user' : 'assistant', content: item.text })),
        }),
      });
      const data: { answer?: string; error?: string } = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error || 'تعذر تلقي الرد');
      setChat((items) => [...items, { from: 'assistant', text: data.answer! }]);
      if (sound || speakReply) say(data.answer);
    } catch (error) {
      setChat((items) => [...items, {
        from: 'assistant',
        text: error instanceof Error ? `تعذر الاتصال بالمساعد: ${error.message}` : 'تعذر الاتصال بالمساعد.',
      }]);
    } finally {
      setAsking(false);
    }
  };

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) {
      setChat((items) => [...items, { from: 'assistant', text: 'التعرف الصوتي غير متاح في هذا المتصفح؛ يمكنك كتابة السؤال بدلاً منه.' }]);
      return;
    }
    const recognition = new Constructor();
    recognition.lang = 'ar-IQ';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setQuestion(transcript);
        void submitQuestion(undefined, transcript, true);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const hotspots = lessonPoints.filter((point) => point.page === page);
  const currentGroup = page >= 78 ? 'frog' : 'butterfly';
  const stages = lessonPoints.filter((point) => point.group === currentGroup);
  const pointForLesson = activePoint?.group === currentGroup ? activePoint : (stages.find((point) => point.page === page) ?? stages[0]);
  const stageContent = pointForLesson ? guidedStages[pointForLesson.id] : null;
  const quizContent = stageContent && pointForLesson ? (
    <div className="school-guided-quiz">
      <h4><Check size={15} /> تحقّق من فهمك</h4>
      <p>{stageContent.question}</p>
      {stageContent.choices.map((choice, index) => (
        <button type="button" key={choice}
          className={`${quizChoice === index ? 'chosen' : ''} ${quizChoice === index && index === stageContent.correctChoice ? 'correct' : ''}`}
          onClick={() => setQuizChoice(index)}>{choice}</button>
      ))}
      {quizChoice !== null && <div className={`school-quiz-feedback ${quizChoice === stageContent.correctChoice ? 'correct' : 'retry'}`} role="status">
        {quizChoice === stageContent.correctChoice ? stageContent.feedback : 'قريب من الإجابة! تأمّل الشرح والصورة، ثم جرّب مرة أخرى.'}
      </div>}
    </div>
  ) : null;

  return (
    <main className="school-app" dir="rtl">
      <header className="school-header">
        <div className="school-brand">
          <span className="school-brand-icon"><GraduationCap size={24} /></span>
          <div><strong>مدرسة الفردوس الافتراضية</strong><small>العلم يصبح تجربةً نعيشها</small></div>
        </div>
        <div className="school-lesson-heading"><strong>دورات حياة الحيوانات</strong><small>علوم • الرابع الابتدائي</small></div>
        <Link href="/" className="school-home"><ArrowLeft size={17} /> جميع الدروس</Link>
      </header>

      <section className={`school-workspace ${assistantOpen ? '' : 'school-chat-hidden'} ${chaptersOpen ? '' : 'school-index-hidden'} ${readerExpanded ? 'school-reading-mode' : ''}`}>
        {chaptersOpen && <aside className="school-chapters">
          <div className="school-side-heading"><BookOpen size={18} /><strong>فهرس الدرس</strong></div>
          {bookPages.map((item) => (
            <button key={item.page} className={`school-chapter ${page === item.page ? 'active' : ''}`} onClick={() => jump(item.page)}>
              <span className="school-chapter-index">{item.page}</span><span>{item.label}</span>
            </button>
          ))}
          <div className="school-chapter-note"><Lightbulb size={18} /><p>الصفحات المعروضة من كتاب <b>العلوم للرابع الابتدائي</b> كما وردت في النسخة الأصلية، دون تعديل.</p></div>
          <button type="button" className="school-hide-index" onClick={() => setChaptersOpen(false)}><PanelRightClose size={15} /> إخفاء الفهرس لتوسيع الكتاب</button>
        </aside>}

        <section className="school-reader" aria-label={readerMode === 'book' ? 'الكتاب الوزاري الأصلي' : 'محاكاة دورة حياة الفراشة'}>
          <div className="school-reader-top">
            <div className="school-reader-modes" role="tablist" aria-label="طريقة التعلم">
              <button type="button" role="tab" aria-selected={readerMode === 'book'} className={readerMode === 'book' ? 'school-reader-mode-active' : 'school-reader-mode-inactive'} onClick={() => setReaderMode('book')}><BookOpen size={15} /> الكتاب</button>
              <button type="button" role="tab" aria-selected={readerMode === 'simulation'} className={readerMode === 'simulation' ? 'school-reader-mode-active' : 'school-reader-mode-inactive'} onClick={openSimulation}><Play size={15} /> محاكاة الفراشة</button>
            </div>
            {readerMode === 'book' && <div className="school-reader-controls">
              <button type="button" onClick={() => setChaptersOpen((prev) => !prev)}
                title={chaptersOpen ? 'إخفاء الفهرس' : 'إظهار الفهرس'} aria-label={chaptersOpen ? 'إخفاء الفهرس' : 'إظهار الفهرس'}>
                {chaptersOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              </button>
              <button onClick={() => setMarkersVisible((prev) => !prev)} className={markersVisible ? 'school-control-on' : ''}><Sparkles size={16} /> نقاط الشرح</button>
              <button type="button" onClick={() => changeZoom(0.8)} title="تصغير الصفحة" aria-label="تصغير الصفحة"><ZoomOut size={16} /></button>
              <span className="school-zoom-label" dir="ltr">{zoomPercent}%</span>
              <button type="button" onClick={() => changeZoom(1.25)} title="تكبير الصفحة" aria-label="تكبير الصفحة"><ZoomIn size={16} /></button>
              <button type="button" onClick={() => setViewMode('page')} className={viewMode === 'page' ? 'school-control-on' : ''} title="إظهار الصفحة كاملة">الصفحة كاملة</button>
              <button type="button" onClick={() => setViewMode('width')} className={viewMode === 'width' ? 'school-control-on' : ''} title="ملاءمة الصفحة لعرض القارئ">ملاءمة العرض</button>
              <button type="button" onClick={() => setReaderExpanded((value) => !value)} title={readerExpanded ? 'العودة إلى عرض الدرس' : 'تكبير عرض الكتاب'} aria-label={readerExpanded ? 'العودة إلى عرض الدرس' : 'تكبير عرض الكتاب'}><Maximize2 size={16} /></button>
            </div>}
          </div>
          {readerMode === 'book' ? <><div className={`school-reader-scroll ${viewMode === 'page' ? 'school-fit-page' : ''}`} ref={viewerRef}>
            <div className="school-page" style={{ width: canvasSize.width, height: canvasSize.height }}>
              <canvas ref={canvasRef} aria-label={`صفحة ${page} من كتاب العلوم للصف الرابع الابتدائي`} />
              {(rendering || !pdf) && !loadError && <div className="school-pdf-loading"><LoaderCircle size={30} className="school-spinner" /><span>جارٍ فتح صفحة الكتاب…</span></div>}
              {loadError && <div className="school-pdf-loading school-pdf-error"><HelpCircle size={27} /><span>{loadError}</span></div>}
              {markersVisible && !rendering && hotspots.map((point) => (
                <button key={point.id} className={`school-hotspot ${activePoint?.id === point.id ? 'selected' : ''}`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} title={point.title} onClick={() => choosePoint(point)} aria-label={`شرح: ${point.title}`}>{point.number}</button>
              ))}
            </div>
          </div>
          {activePoint && <div className="school-explain" role="region" aria-label="شرح النقطة المختارة">
            <button className="school-close-explain" onClick={() => setActivePoint(null)} aria-label="إغلاق الشرح"><X size={17} /></button>
            <span className="school-explain-number">{activePoint.number}</span>
            <div><strong>{activePoint.title}</strong><p>{activePoint.description}</p><button onClick={() => { setReaderExpanded(false); setAssistantOpen(true); setSideTab('lesson'); }}><BookOpen size={15} /> عرض الشرح والأنشطة</button></div>
          </div>}
          <div className="school-reader-footer">
            <button onClick={() => jump(page - 1)} disabled={page <= 1}><ChevronRight size={18} /> السابقة</button>
            <span>الصفحة <strong>{page}</strong> من {pdf?.numPages || 216}</span>
            <button onClick={() => jump(page + 1)} disabled={page >= (pdf?.numPages || 216)}>التالية <ChevronLeft size={18} /></button>
          </div></> : <ButterflySimulation
            stage={simulationStage}
            discovered={simulationDiscovered}
            answer={simulationAnswer}
            onStageChange={chooseSimulationStage}
            onDiscoveryChange={setSimulationDiscovered}
            onAnswerChange={setSimulationAnswer}
            onShowBook={() => setReaderMode('book')}
            onNarrate={say}
          />}
        </section>

        {assistantOpen && <aside className="school-assistant">
          <div className="school-assistant-head"><BookOpen size={20} /><div><strong>{readerMode === 'simulation' ? 'المعلّم الذكي' : 'تعلّم خطوة بخطوة'}</strong><small>{readerMode === 'simulation' ? 'اسأل عن المرحلة التي تشاهدها' : 'شرح وأنشطة مرتبطة بالكتاب'}</small></div><button onClick={() => setAssistantOpen(false)} title="إخفاء لوحة التعلّم" aria-label="إخفاء لوحة التعلّم"><X size={18} /></button></div>
          {readerMode === 'book' && <div className="school-panel-tabs" role="tablist" aria-label="محتوى التعلم والمساعد">
            <button type="button" role="tab" aria-selected={sideTab === 'lesson'} className={sideTab === 'lesson' ? 'active' : ''} onClick={() => setSideTab('lesson')}>الشرح</button>
            <button type="button" role="tab" aria-selected={sideTab === 'activity'} className={sideTab === 'activity' ? 'active' : ''} onClick={() => setSideTab('activity')}>نشاط</button>
            <button type="button" role="tab" aria-selected={sideTab === 'assistant'} className={sideTab === 'assistant' ? 'active' : ''} onClick={() => setSideTab('assistant')}>اسأل</button>
          </div>}
          {readerMode !== 'simulation' && sideTab === 'lesson' ? <div className="school-guided-content" role="tabpanel">
            {pointForLesson && stageContent && <>
              <div className="school-selected-stage">المرحلة {pointForLesson.number} من {stages.length} • {pointForLesson.title}</div>
              <div className="school-feature-art">
                {pointForLesson.group === 'butterfly' && pointForLesson.number === 1 ?
                  <Image src="/school/figma-butterfly-eggs.svg" width={220} height={104} alt="بيوض الفراشة على ورقة نبات" /> :
                  pointForLesson.group === 'butterfly' && pointForLesson.number === 3 ?
                    <Image src="/school/figma-butterfly-chrysalis.svg" width={160} height={106} alt="عذراء الفراشة معلّقة بغصن" /> :
                    <StageIllustration point={pointForLesson} />}
              </div>
              <h2>{pointForLesson.title}</h2>
              <p className="school-stage-description">{stageContent.explanation}</p>
              <div className="school-guided-observe"><Lightbulb size={17} /><p><strong>لاحظ في الكتاب:</strong> {stageContent.lookFor}</p></div>
              {quizContent}
              <div className="school-learning-actions">
                <button type="button" onClick={() => say(`${pointForLesson.title}. ${stageContent.explanation}. ${stageContent.lookFor}`)}><Volume2 size={16} /> استمع للشرح</button>
                <button type="button" className="school-ask-voice" disabled={assistantReady !== 'ready'} title={assistantReady === 'ready' ? 'اسأل بصوتك' : 'المساعد غير متصل بعد'} onClick={() => { setSideTab('assistant'); startListening(); }}><Mic size={16} /> اسأل بصوتك</button>
              </div>
              <div className="school-assistant-context"><BookOpen size={13} /> المساعد يعرف: صفحة {page} • {pointForLesson.title}</div>
              <details className="school-guided-why"><summary>لماذا هذه المرحلة مهمة؟</summary><p>{stageContent.why}</p></details>
            </>}
            <nav className="school-stage-switcher" aria-label="التنقل بين مراحل دورة الحياة">
              {stages.map((point) => <button type="button" key={point.id} className={pointForLesson?.id === point.id ? 'active' : ''}
                aria-pressed={pointForLesson?.id === point.id} onClick={() => { if (page !== point.page) jump(point.page); choosePoint(point); }}>
                {point.number}. {point.title}
              </button>)}
            </nav>
            <div className="school-audio-tools">
              <button type="button" onClick={() => { setSound(true); say('مرحباً بكم يا أبطال في مدرسة الفردوس الابتدائية. اليوم سنكتشف معاً دورة حياة الحيوانات. هيا نبدأ!'); }}><Play size={13} /> الترحيب</button>
              <button type="button" onClick={() => { setSound((prev) => !prev); window.speechSynthesis?.cancel(); }}>{sound ? <Volume2 size={14} /> : <VolumeX size={14} />}{sound ? 'الصوت يعمل' : 'الصوت متوقف'}</button>
            </div>
            <p className="school-guided-ai-note">المحتوى التعليمي متاح دون ذكاء اصطناعي؛ المساعد للأسئلة الإضافية فقط.</p>
          </div> : readerMode !== 'simulation' && sideTab === 'activity' ? <div className="school-guided-content" role="tabpanel">
            <span className="school-guided-label">نشاط تعليمي مُعدّ مسبقاً</span>
            <h2>اختبر معلوماتك</h2>
            <p className="school-guided-intro">اختر المرحلة التي تريد مراجعتها، ثم أجب عن السؤال. يمكنك الرجوع إلى الكتاب في أي وقت.</p>
            <nav className="school-stage-switcher" aria-label="اختيار مرحلة النشاط">
              {stages.map((point) => <button type="button" key={point.id} className={pointForLesson?.id === point.id ? 'active' : ''}
                aria-pressed={pointForLesson?.id === point.id} onClick={() => { if (page !== point.page) jump(point.page); setActivePoint(point); setQuizChoice(null); }}>
                {point.number}. {point.title}
              </button>)}
            </nav>
            {quizContent}
          </div> : <>
            <div className="school-chat" aria-live="polite" role="tabpanel">
              <div className="school-chat-context"><BookOpen size={14} /> صفحة {page}{pointForLesson ? ` • ${pointForLesson.title}` : ''}{readerMode === 'simulation' ? ' • المحاكاة' : ''}</div>
              {readerMode === 'simulation' && <div className="school-chat-learning-state">
                <strong>أنا أتابع ما تتعلمه الآن</strong>
                <span>المرحلة {simulationStage + 1} من 4: {pointForLesson?.title}</span>
                <span>{simulationDiscovered ? 'شاهدتَ الاكتشاف في الرسم.' : 'يمكنك الضغط على زر الاستكشاف في الرسم.'}</span>
                {simulationAnswer !== null && <span>أجبتَ عن سؤال هذه المرحلة؛ يمكنك أن تسألني عن إجابتك.</span>}
              </div>}
              {assistantReady === 'ready' ? <div className="school-chat-status ready"><span /> تم إعداد المساعد؛ يمكنك تجربة طرح سؤال</div>
                : <div className="school-chat-status unavailable">
                  <span /> {assistantReady === 'checking' ? 'جارٍ فحص الاتصال بالمساعد…' : assistantReady === 'missing' ? 'المساعد غير مفعّل بعد؛ يمكنك متابعة التعلم والمحاكاة بدونه.' : 'تعذر التحقق من اتصال المساعد.'}
                  {assistantReady !== 'checking' && <button type="button" onClick={() => void checkAssistant()}>إعادة الفحص</button>}
                </div>}
              {assistantReady === 'ready' && pointForLesson && <div className="school-chat-prompts" aria-label="أسئلة مقترحة">
                <span>يمكنك أن تسألني:</span>
                <button type="button" disabled={asking} onClick={() => void submitQuestion(undefined, pointForLesson.question)}>{pointForLesson.question}</button>
                <button type="button" disabled={asking} onClick={() => void submitQuestion(undefined, 'اشرح لي ما أشاهده الآن بطريقة أبسط.')}>اشرح هذه المرحلة ببساطة</button>
              </div>}
              {chat.map((item, index) => <div key={index} className={`school-chat-bubble ${item.from === 'teacher' ? 'teacher' : 'assistant'}`}><span>{item.text}</span>{item.from === 'assistant' && <button type="button" onClick={() => say(item.text)} aria-label="استمع إلى الإجابة"><Volume2 size={14} /> استمع</button>}</div>)}
              {asking && <div className="school-chat-bubble assistant"><LoaderCircle size={17} className="school-spinner" /> لحظة، أفكر معك…</div>}
              <div ref={chatEndRef} />
            </div>
            <form className="school-chat-form" onSubmit={(event) => void submitQuestion(event)}>
              <label htmlFor="school-question">اسأل عن الرسم أو المرحلة الحالية</label>
              <div><button type="button" disabled={assistantReady !== 'ready' || asking} onClick={startListening} className={listening ? 'school-mic-active' : ''} title={listening ? 'إيقاف الاستماع' : 'اسأل بصوتك؛ سيتم إرسال السؤال بعد التعرف عليه'}>{listening ? <MicOff size={20} /> : <Mic size={20} />}</button><input id="school-question" maxLength={600} disabled={assistantReady !== 'ready' || asking} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={assistantReady !== 'ready' ? 'المساعد غير متصل حالياً' : listening ? 'أستمع إلى سؤالك…' : 'مثلاً: ماذا يحدث داخل الشرنقة؟'} /><button type="submit" disabled={assistantReady !== 'ready' || asking || !question.trim()} title="إرسال السؤال"><Send size={18} /></button></div>
              <button type="button" className="school-chat-audio-toggle" aria-pressed={sound} onClick={() => { setSound((value) => !value); window.speechSynthesis?.cancel(); }}>{sound ? <Volume2 size={14} /> : <VolumeX size={14} />}{sound ? 'القراءة التلقائية تعمل' : 'تفعيل القراءة التلقائية'}</button>
              <small><Check size={12} /> الصوت يعتمد على إمكانات المتصفح • الشرح والأنشطة متاحان دائماً</small>
            </form>
          </>}
        </aside>}
        {!assistantOpen && <button className="school-open-chat" onClick={() => setAssistantOpen(true)}><BookOpen size={20} /> افتح لوحة التعلم</button>}
      </section>
      <footer className="school-footer">نموذج أولي تعليمي — مدرسة الفردوس الافتراضية • الصف الرابع • علوم</footer>
    </main>
  );
}
