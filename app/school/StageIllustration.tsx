import type { LessonPoint } from '@/lib/school/lesson';

/** Small original vector illustrations for the teacher-authored life-cycle guide. */
export function StageIllustration({ point }: { point: LessonPoint }) {
  const isFrog = point.group === 'frog';

  return (
    <svg viewBox="0 0 124 83" role="img" aria-label={`رسم توضيحي: ${point.title}`} className="school-stage-art">
      <rect width="124" height="83" rx="16" fill={isFrog ? '#e5f7fe' : '#f1f9e7'} />
      {isFrog ? <FrogDrawing stage={point.number} /> : <ButterflyDrawing stage={point.number} />}
    </svg>
  );
}

function ButterflyDrawing({ stage }: { stage: number }) {
  if (stage === 1) return <>
    <path d="M15 68 Q20 22 108 22 Q91 73 15 68Z" fill="#70bf6a" stroke="#459b52" strokeWidth="2" />
    <path d="M18 67 Q58 49 102 27" stroke="#e4f5ab" strokeWidth="2" fill="none" />
    {[[55,41],[65,36],[76,34],[62,47],[76,43]].map(([x,y],i) => <ellipse key={i} cx={x} cy={y} rx="5.2" ry="8" transform={`rotate(25 ${x} ${y})`} fill="#f7ce50" stroke="#e7aa26" strokeWidth="1.2" />)}
  </>;
  if (stage === 2) return <>
    <path d="M12 71 Q65 56 112 66" stroke="#478e45" strokeWidth="4" fill="none" strokeLinecap="round" />
    {Array.from({length:7},(_,i)=><circle key={i} cx={24+i*12} cy={54-Math.sin(i/6*Math.PI)*14} r={i===6?11:10} fill={i%2?'#7acb53':'#91d96b'} stroke="#4c9f3e" strokeWidth="1.8" />)}
    <circle cx="104" cy="42" r="2" fill="#273b2a" />
    <path d="M108 31l5-9M97 31l-3-9" stroke="#478e45" strokeWidth="2" strokeLinecap="round" />
  </>;
  if (stage === 3) return <>
    <path d="M13 17 Q65 6 113 20" stroke="#8f6f46" strokeWidth="9" fill="none" strokeLinecap="round" />
    <path d="M62 17v10" stroke="#5b604b" strokeWidth="3" />
    <path d="M62 27 C37 35 48 58 61 76 C77 59 87 36 62 27Z" fill="#91bc5d" stroke="#557d46" strokeWidth="2" />
    <path d="M57 36Q69 47 58 65" stroke="#d7e5a5" strokeWidth="3" fill="none" />
  </>;
  return <>
    <path d="M62 44 Q36 5 12 26 Q8 48 54 49 Q17 81 39 77 Q56 76 62 51" fill="#f8a342" stroke="#7845a0" strokeWidth="3" />
    <path d="M62 44 Q88 5 112 26 Q116 48 70 49 Q107 81 85 77 Q68 76 62 51" fill="#f8a342" stroke="#7845a0" strokeWidth="3" />
    <path d="M62 31v36" stroke="#4b3657" strokeWidth="5" strokeLinecap="round" />
    <path d="M61 32Q53 19 45 20M63 32Q71 19 79 20" stroke="#4b3657" strokeWidth="2" fill="none" />
    {[30,46,79,95].map((x,i)=><circle key={i} cx={x} cy={i%2?34:37} r="4" fill="#fff3cb" />)}
  </>;
}

function FrogDrawing({ stage }: { stage: number }) {
  const water = <path d="M0 66Q15 59 30 66T60 66T90 66T124 66V83H0Z" fill="#93dbec" />;
  if (stage === 1) return <>
    {water}
    {[[34,42],[51,34],[69,42],[85,31],[53,52],[77,56]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="10" fill="#dcf8fa" stroke="#85c5d9" strokeWidth="2"/><circle cx={x} cy={y} r="4" fill="#5b645b" /></g>)}
  </>;
  if (stage === 2) return <>
    {water}
    <path d="M70 46Q97 26 111 24Q96 45 77 56" fill="#7cbe88" stroke="#438d69" strokeWidth="2" />
    <ellipse cx="53" cy="47" rx="28" ry="19" fill="#68b676" stroke="#438d69" strokeWidth="2" />
    <circle cx="39" cy="42" r="4" fill="white"/><circle cx="38" cy="42" r="2" fill="#253f35" />
  </>;
  if (stage === 3) return <>
    {water}
    <path d="M85 60Q107 64 115 50" stroke="#5ba969" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M42 54L24 70M82 56L99 70" stroke="#368d5e" strokeWidth="8" strokeLinecap="round" />
    <ellipse cx="62" cy="45" rx="34" ry="24" fill="#65bf68" stroke="#308451" strokeWidth="2" />
    <circle cx="47" cy="31" r="8" fill="#7bd37a"/><circle cx="76" cy="31" r="8" fill="#7bd37a" />
    <circle cx="47" cy="29" r="3" fill="#214136"/><circle cx="76" cy="29" r="3" fill="#214136" />
  </>;
  return <>
    <path d="M36 55L17 69M88 55l19 14M40 63l-8 12M83 63l8 12" stroke="#348950" strokeWidth="9" strokeLinecap="round" />
    <ellipse cx="62" cy="51" rx="35" ry="26" fill="#6bc66d" stroke="#308b51" strokeWidth="2.5" />
    <circle cx="41" cy="29" r="12" fill="#79d27c" stroke="#308b51" strokeWidth="2"/><circle cx="84" cy="29" r="12" fill="#79d27c" stroke="#308b51" strokeWidth="2" />
    <circle cx="41" cy="27" r="4" fill="#25493b"/><circle cx="84" cy="27" r="4" fill="#25493b" />
    <path d="M50 56Q62 68 74 56" stroke="#388a52" fill="none" strokeWidth="2.5" strokeLinecap="round" />
  </>;
}
