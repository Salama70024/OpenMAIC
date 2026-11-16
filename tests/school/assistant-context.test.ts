import { describe, expect, it } from 'vitest';
import { buildSchoolAssistantInstructions } from '@/lib/school/assistant-context';

describe('lesson-aware school assistant context', () => {
  it('uses the butterfly stage, textbook page, exploration and student answer', () => {
    const instructions = buildSchoolAssistantInstructions({
      page: 73,
      pointId: 'butterfly-larva',
      mode: 'simulation',
      discoveryShown: true,
      quizChoice: 1,
    });
    expect(instructions).toContain('الصفحة الحالية: 73');
    expect(instructions).toContain('اليرقة');
    expect(instructions).toContain('محاكاة دورة حياة الفراشة');
    expect(instructions).toContain('ضغط الطالب على زر الاستكشاف في المشهد الحالي: نعم');
    expect(instructions).toContain('الإجابة صحيحة');
    expect(instructions).not.toContain('أبو ذنيبة');
  });

  it('does not mix frog stages into butterfly context even with a forged stage ID', () => {
    const instructions = buildSchoolAssistantInstructions({
      page: 73,
      pointId: 'frog-tadpole',
      mode: 'simulation',
      quizChoice: 2,
    });
    expect(instructions).not.toContain('أبو ذنيبة');
    expect(instructions).toContain('لم يختر الطالب مرحلة محددة بعد');
  });

  it('describes the frog textbook independently from butterfly simulation', () => {
    const instructions = buildSchoolAssistantInstructions({
      page: 81,
      pointId: 'frog-young',
      mode: 'book',
    });
    expect(instructions).toContain('الضفدع');
    expect(instructions).not.toContain('محاكاة دورة حياة الفراشة');
  });
});
