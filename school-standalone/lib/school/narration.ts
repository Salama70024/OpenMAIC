import { guidedStages } from './learning-content';
import { lessonPoints } from './lesson';

export const SCHOOL_WELCOME_AUDIO_ID = 'welcome';

/** Only author-approved lesson text can be synthesized; the client cannot supply arbitrary TTS input. */
export function getSchoolNarrationText(audioId: string): string | null {
  if (audioId === SCHOOL_WELCOME_AUDIO_ID) {
    return 'مرحباً بكم يا أبطال في مدرسة الفردوس الابتدائية. اليوم سنكتشف معاً دورة حياة الحيوانات. هيا نبدأ!';
  }
  const point = lessonPoints.find((candidate) => candidate.id === audioId);
  if (!point) return null;
  const lesson = guidedStages[point.id];
  return `${point.title}. ${lesson.explanation} ${lesson.lookFor}`;
}
