'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { guidedStages } from '@/lib/school/learning-content';
import { lessonPoints } from '@/lib/school/lesson';

const butterflyStages = lessonPoints.filter((point) => point.group === 'butterfly');

const interactions = [
  { prompt: 'اضغط على البيوض لترى ما يحدث قبل الفقس', discovery: 'يتكوّن الجنين داخل البيضة، ثم تخرج منها يرقة صغيرة لتبدأ التغذّي.' },
  { prompt: 'اضغط على اليرقة وشاهد أثر تغذّيها', discovery: 'تأكل اليرقة أوراق النباتات وتنمو استعداداً للانتقال إلى مرحلة العذراء.' },
  { prompt: 'اضغط على العذراء لتكتشف التحوّل', discovery: 'يتغيّر جسم الحشرة داخل العذراء حتى تتكوّن الفراشة الكاملة.' },
  { prompt: 'اضغط على الفراشة لتبدأ دورة جديدة', discovery: 'بعد اكتمال نموها وتكاثرها، تضع أنثى الفراشة بيوضاً جديدة.' },
] as const;

type Props = {
  stage: number;
  onStageChange: (stage: number) => void;
  onShowBook: () => void;
  onNarrate: (text: string) => void;
};

/** A teacher-authored, offline-capable simulation; no model or external service is used. */
export function ButterflySimulation({ stage, onStageChange, onShowBook, onNarrate }: Props) {
  const [playing, setPlaying] = useState(false);
  const [discoveredStage, setDiscoveredStage] = useState<number | null>(null);
  const [stageAnswer, setStageAnswer] = useState<{ stage: number; choice: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const point = butterflyStages[stage];
  const lesson = guidedStages[point.id];
  const discovered = discoveredStage === stage;
  const answer = stageAnswer?.stage === stage ? stageAnswer.choice : null;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (stage === butterflyStages.length - 1) {
        setPlaying(false);
        setFinished(true);
      } else {
        onStageChange(stage + 1);
      }
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [playing, stage, onStageChange]);

  const chooseStage = (index: number) => {
    setPlaying(false);
    setFinished(false);
    onStageChange(index);
  };

  const togglePlayback = () => {
    if (playing) {
      setPlaying(false);
    } else {
      setFinished(false);
      if (stage === butterflyStages.length - 1) onStageChange(0);
      setPlaying(true);
    }
  };

  return (
    <div className="school-simulation" dir="rtl">
      <div className="school-sim-header">
        <div>
          <span className="school-sim-eyebrow">تجربة تعليمية تفاعلية • علوم</span>
          <h2>رحلة حياة الفراشة <span aria-hidden="true">🦋</span></h2>
          <p>استكشف كيف تتحوّل البيضة إلى فراشة، وتفاعل مع كل مرحلة بيدك.</p>
        </div>
        <button type="button" className="school-sim-book-link" onClick={onShowBook}><BookOpen size={16} /> العودة إلى الكتاب <ArrowRight size={15} /></button>
      </div>

      <div className="school-sim-body">
        <div className="school-sim-main">
          <div className="school-sim-scene" aria-label={`الرسم المتحرك: ${point.title}`}>
            <div className="school-sim-sky-label"><span className="school-sim-live-dot" /> مشهد تفاعلي</div>
            <ButterflyScene stage={stage} discovered={discovered} />
            <button
              type="button"
              className="school-sim-discover"
              onClick={() => setDiscoveredStage(discovered ? null : stage)}
              aria-pressed={discovered}
              aria-label={interactions[stage].prompt}
            ><span className="school-sim-discover-ring">+</span> {discovered ? 'إخفاء الاكتشاف' : 'اضغط هنا للاستكشاف'}</button>
          </div>
          <div className={`school-sim-observation ${discovered ? 'revealed' : ''}`} aria-live="polite">
            <span aria-hidden="true">{discovered ? '💡' : '👆'}</span>
            <p>{discovered ? interactions[stage].discovery : interactions[stage].prompt}</p>
          </div>
          <div className="school-sim-playback">
            <button type="button" className="school-sim-play" onClick={togglePlayback}>
              {playing ? <Pause size={17} /> : <Play size={17} />}
              {playing ? 'إيقاف العرض' : finished ? 'إعادة مشاهدة الدورة' : 'شاهد دورة الحياة'}
            </button>
            <button type="button" onClick={() => chooseStage(Math.max(0, stage - 1))} disabled={stage === 0}><ChevronRight size={16} /> السابقة</button>
            <button type="button" onClick={() => chooseStage(Math.min(butterflyStages.length - 1, stage + 1))} disabled={stage === butterflyStages.length - 1}>التالية <ChevronLeft size={16} /></button>
            <span className="school-sim-count">{stage + 1} / {butterflyStages.length}</span>
          </div>
        </div>

        <aside className="school-sim-lesson" aria-label="شرح المرحلة التعليمية">
          <span className="school-sim-stage-badge">المرحلة {stage + 1} من {butterflyStages.length}</span>
          <h3>{point.title}</h3>
          <p className="school-sim-description">{lesson.explanation}</p>
          <div className="school-sim-insight"><strong>لاحظ في الكتاب</strong><p>{lesson.lookFor}</p></div>
          <button type="button" className="school-sim-listen" onClick={() => onNarrate(`${point.title}. ${lesson.explanation}`)}><Volume2 size={16} /> استمع إلى شرح المرحلة</button>
          <div className="school-sim-quiz">
            <strong><Check size={16} /> تحقّق من فهمك</strong>
            <p>{lesson.question}</p>
            {lesson.choices.map((choice, index) => (
              <button type="button" key={choice}
                className={`${answer === index ? 'chosen' : ''} ${answer === index && index === lesson.correctChoice ? 'correct' : ''}`}
                onClick={() => setStageAnswer({ stage, choice: index })}
                aria-pressed={answer === index}>{choice}</button>
            ))}
            {answer !== null && <div className={`school-sim-quiz-result ${answer === lesson.correctChoice ? 'correct' : 'retry'}`} role="status">
              {answer === lesson.correctChoice ? lesson.feedback : 'حاول مرة أخرى. راقب الرسم واقرأ الشرح.'}
            </div>}
          </div>
        </aside>
      </div>

      <nav className="school-sim-timeline" aria-label="مراحل دورة حياة الفراشة">
        {butterflyStages.map((item, index) => (
          <button type="button" key={item.id} className={`school-sim-step ${stage === index ? 'active' : ''}`}
            onClick={() => chooseStage(index)} aria-current={stage === index ? 'step' : undefined}>
            <span className="school-sim-step-number">{index + 1}</span>
            <span>{item.title}</span>
            {index < butterflyStages.length - 1 && <ChevronLeft size={16} aria-hidden="true" />}
          </button>
        ))}
      </nav>
      {finished && <div className="school-sim-finished" role="status"><Check size={17} /> أحسنت! شاهدت المراحل الأربع. يمكن أن تبدأ الدورة من بيضة جديدة. <button onClick={() => chooseStage(0)}><RotateCcw size={15} /> ابدأ من جديد</button></div>}
      <p className="school-sim-disclaimer">المحاكاة رسم توضيحي مبسّط يعتمد على الدرس المدرسي، وليست تصويراً بالحجم الطبيعي. تعمل دون اتصال بخدمة الذكاء الاصطناعي.</p>
    </div>
  );
}

function ButterflyScene({ stage, discovered }: { stage: number; discovered: boolean }) {
  return <svg key={stage} className="school-sim-svg" viewBox="0 0 760 440" role="img" aria-label={`مشهد ${butterflyStages[stage].title}`}>
    <defs>
      <linearGradient id="sim-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eefbfe" /><stop offset="1" stopColor="#f9fce9" /></linearGradient>
      <linearGradient id="sim-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#addf78" /><stop offset="1" stopColor="#50a661" /></linearGradient>
      <linearGradient id="sim-pupa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bad77f" /><stop offset="1" stopColor="#59935b" /></linearGradient>
    </defs>
    <rect width="760" height="440" fill="url(#sim-sky)" />
    <circle cx="650" cy="86" r="57" fill="#ffeba4" opacity=".5" />
    <circle cx="90" cy="68" r="41" fill="#fff" opacity=".55" />
    <path d="M0 366Q140 335 310 374T760 362V440H0Z" fill="#d4eac4" opacity=".8" />
    <path d="M0 400Q160 365 330 401T760 394V440H0Z" fill="#c5dda8" opacity=".5" />
    <g className="school-sim-stage-scene">
      {stage === 0 && <>
        <path d="M12 340Q210 307 610 350" fill="none" stroke="#9a8155" strokeWidth="19" strokeLinecap="round" />
        <path d="M105 324Q180 128 578 178Q470 395 105 324Z" fill="url(#sim-leaf)" stroke="#429957" strokeWidth="5" />
        <path d="M109 325Q324 272 568 181" stroke="#e7f8bf" strokeWidth="5" fill="none" />
        {[[290,230],[332,206],[382,215],[324,263],[375,259],[420,237]].map(([x,y],index)=><g key={index}><ellipse cx={x} cy={y} rx="21" ry="31" transform={`rotate(19 ${x} ${y})`} fill="#ffd65a" stroke="#dfa62f" strokeWidth="3"/><ellipse cx={x-5} cy={y-9} rx="6" ry="11" fill="#fff6bf" opacity=".75" /></g>)}
        {discovered && <g className="school-sim-reveal"><path d="M304 210l-11 18 14 12-8 14M365 198l-8 19 13 15" fill="none" stroke="#b87928" strokeWidth="4" strokeLinecap="round" /><path d="M326 251q16-30 25 0" fill="none" stroke="#79b35a" strokeWidth="8" strokeLinecap="round"/></g>}
      </>}
      {stage === 1 && <>
        <path d="M65 326Q220 260 635 320" fill="none" stroke="#a48a5d" strokeWidth="14" strokeLinecap="round" />
        <path d="M100 300Q205 100 604 200Q425 392 100 300Z" fill="url(#sim-leaf)" stroke="#429957" strokeWidth="4" />
        <path d="M105 300Q330 245 595 205" stroke="#d5ecaf" strokeWidth="5" fill="none" />
        {discovered && <g className="school-sim-reveal" fill="#eaf9df"><ellipse cx="207" cy="241" rx="15" ry="12" /><ellipse cx="272" cy="232" rx="22" ry="12" /><ellipse cx="363" cy="206" rx="17" ry="11" /><ellipse cx="440" cy="216" rx="19" ry="9" /></g>}
        <g className="school-sim-caterpillar">
          {Array.from({length:9},(_,i)=><g key={i}><circle cx={235+i*34} cy={247-Math.sin(i/8*Math.PI)*59} r={i===8?32:29} fill={i%2===0?'#93d85d':'#76c550'} stroke="#438e46" strokeWidth="3" /><ellipse cx={227+i*34} cy={237-Math.sin(i/8*Math.PI)*59} rx="9" ry="12" fill="#b9ed7b" opacity=".75" /></g>)}
          <circle cx="505" cy="211" r="7" fill="#264c37" /><circle cx="507" cy="209" r="2.8" fill="white" />
          <path d="M517 188l17-24M490 182l-8-25" stroke="#438e46" strokeWidth="4" strokeLinecap="round" />
        </g>
      </>}
      {stage === 2 && <>
        <path d="M135 125Q365 49 649 135" stroke="#8d7453" strokeWidth="23" strokeLinecap="round" fill="none" />
        <path d="M242 110q-56 32-71 94q66-2 101-79M553 109q64 18 84 76q-58-9-96-57" fill="#8ecc7b" stroke="#589759" strokeWidth="4" />
        <path d="M382 96v40" stroke="#677e49" strokeWidth="8" />
        <g className="school-sim-chrysalis">
          <path d="M382 132C298 161 306 267 383 343C458 256 466 164 382 132Z" fill="url(#sim-pupa)" stroke="#52885b" strokeWidth="6" />
          <path d="M355 167Q407 179 376 296M410 165Q439 220 394 306" fill="none" stroke="#d5e9a2" strokeWidth="9" opacity=".68" />
          <path d="M348 182Q384 215 421 181M329 228Q383 250 440 225" stroke="#75a968" strokeWidth="4" fill="none" />
          {discovered && <g className="school-sim-reveal" opacity=".63"><path d="M382 253Q340 164 346 229Q356 255 379 262Q322 283 353 293Q367 296 382 269Q394 301 411 292Q443 284 385 262Q413 246 418 215Q410 170 382 253Z" fill="#edb24a" stroke="#824d9c" strokeWidth="3" /></g>}
        </g>
      </>}
      {stage === 3 && <>
        <path d="M81 348Q230 312 651 337" stroke="#9a8155" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M130 323Q208 184 366 273Q294 377 130 323Z" fill="url(#sim-leaf)" stroke="#429957" strokeWidth="4" />
        <path d="M130 324Q259 294 355 275" fill="none" stroke="#d5eea8" strokeWidth="4" />
        <g className="school-sim-butterfly">
          <g className="school-sim-wing-left"><path d="M382 212C333 92 192 75 206 185Q223 249 365 249C246 257 243 338 321 319Q365 295 382 245Z" fill="#f7a333" stroke="#3e3e58" strokeWidth="11"/><path d="M374 220Q273 130 227 171M368 244Q287 226 270 295" fill="none" stroke="#493d51" strokeWidth="9" /><circle cx="245" cy="177" r="15" fill="#fff8db"/><circle cx="293" cy="295" r="11" fill="#fff8db"/></g>
          <g className="school-sim-wing-right"><path d="M382 212C431 92 572 75 558 185Q541 249 399 249C518 257 521 338 443 319Q399 295 382 245Z" fill="#f7a333" stroke="#3e3e58" strokeWidth="11"/><path d="M390 220Q491 130 537 171M396 244Q477 226 494 295" fill="none" stroke="#493d51" strokeWidth="9" /><circle cx="519" cy="177" r="15" fill="#fff8db"/><circle cx="471" cy="295" r="11" fill="#fff8db"/></g>
          <path d="M383 203Q373 164 355 160M385 203Q395 164 413 160" stroke="#3e3e58" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="383" cy="247" rx="14" ry="66" fill="#403e52"/><circle cx="383" cy="198" r="16" fill="#403e52" />
        </g>
        {discovered && <g className="school-sim-reveal"><ellipse cx="218" cy="316" rx="9" ry="14" fill="#fbd85d" stroke="#daae35" strokeWidth="2" /><ellipse cx="239" cy="309" rx="9" ry="14" fill="#fbd85d" stroke="#daae35" strokeWidth="2" /><ellipse cx="262" cy="303" rx="9" ry="14" fill="#fbd85d" stroke="#daae35" strokeWidth="2" /></g>}
      </>}
    </g>
  </svg>;
}
