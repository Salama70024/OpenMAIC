import { describe, expect, it } from 'vitest';
import { buildSchoolVoiceInstructions, parseVoiceSnapshot } from '@/lib/school/voice-instructions';
import { getSchoolNarrationText } from '@/lib/school/narration';

describe('school voice context and narration', () => {
  it('knows the stage and the learner interaction without losing the authored textbook facts', () => {
    const instructions = buildSchoolVoiceInstructions({
      page: 73, pointId: 'butterfly-larva', mode: 'simulation', discoveryShown: true, quizChoice: 1,
    });
    expect(instructions).toContain('المرحلة التي يراها الطالب الآن: 2 من 4');
    expect(instructions).toContain('ضغط الطالب على زر الاستكشاف في المشهد الحالي: نعم');
    expect(instructions).toContain('أوراق النباتات');
    expect(instructions).toContain('محادثة صوتية طبيعية');
  });

  it('rejects invalid pages and normalizes an unsupported mode', () => {
    expect(parseVoiceSnapshot({ page: 0 })).toBeNull();
    expect(parseVoiceSnapshot({ page: 73.5 })).toBeNull();
    expect(parseVoiceSnapshot({ page: 81, mode: 'simulation' })?.mode).toBe('book');
  });

  it('never accepts arbitrary text as a narration request', () => {
    expect(getSchoolNarrationText('butterfly-larva')).toContain('تخرج اليرقة من البيضة');
    expect(getSchoolNarrationText('frog-adult')).toContain('الضفدع');
    expect(getSchoolNarrationText('welcome')).toContain('مرحباً');
    expect(getSchoolNarrationText('../../etc/passwd')).toBeNull();
  });
});
