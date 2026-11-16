'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, GraduationCap,
  HelpCircle, Lightbulb, LoaderCircle, Maximize2, MessageCircle, Mic, MicOff,
  Play, Send, Sparkles, Volume2, VolumeX, X,
} from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { bookPages, lessonPoints, type LessonPoint } from '@/lib/school/lesson';
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
  const [pageWidth, setPageWidth] = useState(700);
  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 990 });
  const [rendering, setRendering] = useState(true);
  const [activePoint, setActivePoint] = useState<LessonPoint | null>(null);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [readerExpanded, setReaderExpanded] = useState(false);
  const [sound, setSound] = useState(false);
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([{
    from: 'assistant',
    text: 'أهلاً يا أبطال! اختاروا إحدى العلامات المضيئة فوق الكتاب، أو اسألوني عن دورة حياة الفراشة والضفدع.',
  }]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
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
      if (entry) setPageWidth(Math.max(240, Math.floor(entry.contentRect.width - 24)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
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
        const viewport = sheet.getViewport({ scale: pageWidth / native.width });
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
  }, [pdf, page, pageWidth]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chat]);

  const jump = useCallback((target: number) => {
    setPage(Math.max(1, Math.min(pdf?.numPages || 216, target)));
    setActivePoint(null);
    setLoadError('');
  }, [pdf]);

  const choosePoint = (point: LessonPoint) => {
    setActivePoint(point);
    setAssistantOpen(true);
    if (sound) say(`${point.title}. ${point.description}`);
  };

  const submitQuestion = async (event?: FormEvent, proposed?: string) => {
    event?.preventDefault();
    const text = (proposed || question).trim();
    if (!text || asking) return;
    setQuestion('');
    setAsking(true);
    setAssistantOpen(true);
    setChat((items) => [...items, { from: 'teacher', text }]);
    try {
      const response = await fetch('/api/school/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, page, pointId: activePoint?.id }),
      });
      const data: { answer?: string; error?: string } = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error || 'تعذر تلقي الرد');
      setChat((items) => [...items, { from: 'assistant', text: data.answer! }]);
      if (sound) say(data.answer);
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
      if (transcript) setQuestion(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const hotspots = lessonPoints.filter((point) => point.page === page);

  return (
    <main className="school-app" dir="rtl">
      <header className="school-header">
        <div className="school-brand">
          <span className="school-brand-icon"><GraduationCap size={27} /></span>
          <div><strong>مدرسة الفردوس الافتراضية</strong><small>العلم يصبح تجربةً نعيشها</small></div>
        </div>
        <div className="school-crumbs"><span>الابتدائية</span><ChevronLeft size={16} /><span>الرابع الابتدائي</span><ChevronLeft size={16} /><strong>العلوم</strong></div>
        <Link href="/" className="school-home"><ArrowLeft size={17} /> OpenMAIC</Link>
      </header>

      <section className="school-intro">
        <div>
          <span className="school-eyebrow"><Sparkles size={15} /> الدرس التفاعلي الأول</span>
          <h1>دورات حياة الحيوانات <span>🦋</span></h1>
          <p>الكتاب الوزاري الأصلي أمامك. اضغط على الدوائر المضيئة لتتعرف إلى كل مرحلة، أو اسأل المعلم الذكي مباشرة.</p>
        </div>
        <div className="school-intro-actions">
          <button className="school-start" onClick={() => { setSound(true); say('مرحباً بكم يا أبطال في مدرسة الفردوس الابتدائية. اليوم سنكتشف معاً أسرار دورة حياة الحيوانات. هيا نبدأ!'); }}><Play size={18} fill="currentColor" /> تشغيل الترحيب الصوتي</button>
          <button className="school-pill" onClick={() => { setSound((prev) => !prev); window.speechSynthesis?.cancel(); }} title="تشغيل أو كتم صوت الشرح">{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}{sound ? 'الصوت يعمل' : 'الصوت متوقف'}</button>
        </div>
      </section>

      <section className={`school-workspace ${assistantOpen ? '' : 'school-chat-hidden'} ${readerExpanded ? 'school-reading-mode' : ''}`}>
        <aside className="school-chapters">
          <div className="school-side-heading"><BookOpen size={18} /><strong>فهرس الدرس</strong></div>
          {bookPages.map((item) => (
            <button key={item.page} className={`school-chapter ${page === item.page ? 'active' : ''}`} onClick={() => jump(item.page)}>
              <span className="school-chapter-index">{item.page}</span><span>{item.label}</span>
            </button>
          ))}
          <div className="school-chapter-note"><Lightbulb size={18} /><p>الصفحات المعروضة من كتاب <b>العلوم للرابع الابتدائي</b> كما وردت في النسخة الأصلية، دون تعديل.</p></div>
          <div className="school-side-heading school-points-heading"><Sparkles size={18} /><strong>نقاط تفاعلية</strong></div>
          {lessonPoints.filter((point) => point.group === (page >= 78 ? 'frog' : 'butterfly')).map((point) => (
            <button className={`school-point-link ${activePoint?.id === point.id ? 'active' : ''}`} key={point.id} onClick={() => { if (point.page !== page) jump(point.page); choosePoint(point); }}>
              <span>{point.number}</span>{point.title}{point.page !== page && <ChevronLeft size={14} />}
            </button>
          ))}
        </aside>

        <section className="school-reader">
          <div className="school-reader-top">
            <div className="school-reader-title"><BookOpen size={19} /><strong>الكتاب المدرسي الرسمي</strong><span className="school-reader-subtitle">نسخة تفاعلية</span></div>
            <div className="school-reader-controls">
              <button onClick={() => setMarkersVisible((prev) => !prev)} className={markersVisible ? 'school-control-on' : ''}><Sparkles size={16} /> نقاط الشرح</button>
              <button type="button" onClick={() => setReaderExpanded((value) => !value)} title={readerExpanded ? 'العودة إلى عرض الدرس' : 'تكبير عرض الكتاب'} aria-label={readerExpanded ? 'العودة إلى عرض الدرس' : 'تكبير عرض الكتاب'}><Maximize2 size={16} /></button>
            </div>
          </div>
          <div className="school-reader-scroll" ref={viewerRef}>
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
            <div><strong>{activePoint.title}</strong><p>{activePoint.description}</p><button onClick={() => void submitQuestion(undefined, activePoint.question)}><MessageCircle size={15} /> اسأل المساعد: {activePoint.question}</button></div>
          </div>}
          <div className="school-reader-footer">
            <button onClick={() => jump(page - 1)} disabled={page <= 1}><ChevronRight size={18} /> السابقة</button>
            <span>الصفحة <strong>{page}</strong> من {pdf?.numPages || 216}</span>
            <button onClick={() => jump(page + 1)} disabled={page >= (pdf?.numPages || 216)}>التالية <ChevronLeft size={18} /></button>
          </div>
        </section>

        {assistantOpen && <aside className="school-assistant">
          <div className="school-assistant-head"><span className="school-ai-avatar"><Sparkles size={22} /></span><div><strong>المعلم الذكي</strong><small><span className="school-online-dot" /> يفهم الصفحة الحالية</small></div><button onClick={() => setAssistantOpen(false)} title="إغلاق المحادثة"><X size={18} /></button></div>
          <div className="school-chat" aria-live="polite">
            <div className="school-chat-context"><BookOpen size={14} /> مرتبط بصفحة {page}{activePoint ? ` • ${activePoint.title}` : ''}</div>
            {chat.map((item, index) => <div key={index} className={`school-chat-bubble ${item.from === 'teacher' ? 'teacher' : 'assistant'}`}>{item.text}</div>)}
            {asking && <div className="school-chat-bubble assistant"><LoaderCircle size={17} className="school-spinner" /> لحظة، أفكر معك…</div>}
            <div ref={chatEndRef} />
          </div>
          <form className="school-chat-form" onSubmit={(event) => void submitQuestion(event)}>
            <label htmlFor="school-question">اسأل عن الرسم أو الفقرة التي أمامك</label>
            <div><button type="button" onClick={startListening} className={listening ? 'school-mic-active' : ''} title="تسجيل سؤال صوتي">{listening ? <MicOff size={20} /> : <Mic size={20} />}</button><input id="school-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={listening ? 'أستمع إلى سؤالك…' : 'مثلاً: ماذا يحدث داخل الشرنقة؟'} /><button type="submit" disabled={asking || !question.trim()} title="إرسال السؤال"><Send size={18} /></button></div>
            <small><Check size={12} /> يستند إلى موضوع الدرس • الصوت التجريبي يعتمد على المتصفح</small>
          </form>
        </aside>}
        {!assistantOpen && <button className="school-open-chat" onClick={() => setAssistantOpen(true)}><MessageCircle size={20} /> افتح المعلم الذكي</button>}
      </section>
      <footer className="school-footer">نموذج أولي تعليمي — مدرسة الفردوس الافتراضية • الصف الرابع • علوم</footer>
    </main>
  );
}
