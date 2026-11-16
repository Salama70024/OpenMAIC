import { describe, expect, it } from 'vitest';
import { bookPages, getLessonContext, lessonPoints } from '@/lib/school/lesson';
import { guidedStages } from '@/lib/school/learning-content';

describe('interactive school science lesson', () => {
  it('anchors every hotspot to an actual PDF page using normalized coordinates', () => {
    expect(lessonPoints).toHaveLength(8);
    for (const point of lessonPoints) {
      expect(point.page).toBeGreaterThanOrEqual(1);
      expect(point.page).toBeLessThanOrEqual(216);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(1);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(1);
    }
  });

  it('includes the photographed butterfly and frog diagrams', () => {
    expect(bookPages.map((item) => item.page)).toEqual(expect.arrayContaining([73, 74, 81]));
    expect(lessonPoints.filter((point) => point.group === 'butterfly').map((point) => point.number)).toEqual([1, 2, 3, 4]);
    expect(lessonPoints.filter((point) => point.group === 'frog').map((point) => point.number)).toEqual([1, 2, 3, 4]);
  });

  it('provides only the selected section to the assistant', () => {
    const butterfly = getLessonContext(73, 'butterfly-larva');
    const frog = getLessonContext(81, 'frog-tadpole');
    expect(butterfly.selected?.title).toBe('اليرقة');
    expect(butterfly.facts).not.toContain('أبو ذنيبة');
    expect(frog.selected?.title).toBe('أبو ذنيبة');
    expect(frog.facts).not.toContain('الفراشة');
    expect(getLessonContext(73, 'frog-egg').selected).toBeUndefined();
    expect(getLessonContext(81, 'butterfly-adult').selected).toBeUndefined();
  });

  it('includes complete teacher-authored explanations and quizzes for every interactive stage', () => {
    for (const point of lessonPoints) {
      const content = guidedStages[point.id];
      expect(content, `${point.id} is missing its authored lesson`).toBeDefined();
      expect(content.explanation.length).toBeGreaterThan(40);
      expect(content.lookFor.length).toBeGreaterThan(10);
      expect(content.why.length).toBeGreaterThan(10);
      expect(content.choices).toHaveLength(3);
      expect(content.correctChoice).toBeGreaterThanOrEqual(0);
      expect(content.correctChoice).toBeLessThan(3);
      expect(content.feedback.length).toBeGreaterThan(10);
    }
  });
});
