export type LessonPoint = {
  id: string;
  page: number;
  x: number;
  y: number;
  number: number;
  title: string;
  description: string;
  question: string;
  group: 'butterfly' | 'frog';
};

/**
 * Hotspot coordinates are fractions of the ORIGINAL A4 PDF page, not screen pixels.
 * Keep the textbook unchanged: annotations live entirely in our own overlay.
 */
export const lessonPoints: LessonPoint[] = [
  {
    id: 'butterfly-egg', page: 73, x: 0.35, y: 0.32, number: 1,
    title: 'البيضة', group: 'butterfly',
    description: 'تضع الفراشة البيوض على أوراق النباتات. ينمو الجنين داخل البيضة حتى يفقس.',
    question: 'لماذا تضع الفراشة بيوضها على أوراق النباتات؟',
  },
  {
    id: 'butterfly-larva', page: 73, x: 0.69, y: 0.58, number: 2,
    title: 'اليرقة', group: 'butterfly',
    description: 'تخرج من البيضة يرقة تتغذى على أوراق النباتات وتنمو بسرعة.',
    question: 'ماذا تأكل يرقة الفراشة؟',
  },
  {
    id: 'butterfly-pupa', page: 73, x: 0.32, y: 0.83, number: 3,
    title: 'العذراء (الشرنقة)', group: 'butterfly',
    description: 'تثبت اليرقة نفسها على غصن، ثم يحيط بها غلاف خارجي يسمى الشرنقة.',
    question: 'ماذا يحدث داخل شرنقة الفراشة؟',
  },
  {
    id: 'butterfly-adult', page: 74, x: 0.34, y: 0.22, number: 4,
    title: 'الفراشة الكاملة', group: 'butterfly',
    description: 'تخرج الفراشة من الشرنقة وتفرد جناحيها، ثم تتكاثر لتبدأ دورة جديدة.',
    question: 'كيف تبدأ دورة حياة الفراشة من جديد؟',
  },
  {
    id: 'frog-egg', page: 81, x: 0.76, y: 0.68, number: 1,
    title: 'بيوض الضفدع', group: 'frog',
    description: 'تضع أنثى الضفدع عدداً كبيراً من البيوض الصغيرة في الماء.',
    question: 'لماذا يضع الضفدع بيوضه في الماء؟',
  },
  {
    id: 'frog-tadpole', page: 81, x: 0.48, y: 0.82, number: 2,
    title: 'أبو ذنيبة', group: 'frog',
    description: 'يفقس البيض ويخرج صغير يشبه السمكة له ذيل، ويعيش في الماء ويتنفس بالخياشيم.',
    question: 'كيف يتنفس أبو ذنيبة وهو في الماء؟',
  },
  {
    id: 'frog-young', page: 81, x: 0.29, y: 0.67, number: 3,
    title: 'ضفدع نامٍ', group: 'frog',
    description: 'تنمو الأرجل والرئتان تدريجياً، ويصبح الضفدع قادراً على التنفس خارج الماء.',
    question: 'ما التغيرات التي تحدث لأبو ذنيبة عندما ينمو؟',
  },
  {
    id: 'frog-adult', page: 81, x: 0.55, y: 0.53, number: 4,
    title: 'ضفدع مكتمل النمو', group: 'frog',
    description: 'يكتمل نمو الضفدع، فيستطيع العيش قرب الماء وعلى اليابسة ويعيد دورة حياته.',
    question: 'بماذا يختلف الضفدع المكتمل عن أبو ذنيبة؟',
  },
];

export const bookPages = [
  { page: 70, label: 'بداية الفصل: دورات حياة الحيوانات' },
  { page: 73, label: 'مراحل حياة الفراشة' },
  { page: 74, label: 'مخطط دورة الفراشة' },
  { page: 78, label: 'دورات حياة الحيوانات الفقرية' },
  { page: 81, label: 'مخطط دورة الضفدع' },
];

export function getLessonContext(page: number, pointId?: string) {
  const section = page >= 78 ? 'دورة حياة الضفدع (الفقريات)' : 'دورة حياة الفراشة (اللافقريات)';
  const selected = lessonPoints.find((point) => point.id === pointId);
  const relevant = lessonPoints.filter((point) => point.group === (page >= 78 ? 'frog' : 'butterfly'));
  return {
    section,
    selected,
    facts: relevant.map((point) => `${point.number}. ${point.title}: ${point.description}`).join('\n'),
  };
}
