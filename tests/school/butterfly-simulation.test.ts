import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ButterflySimulation } from '../../app/school/ButterflySimulation';
import { guidedStages } from '../../lib/school/learning-content';
import { lessonPoints } from '../../lib/school/lesson';

describe('butterfly learning simulation', () => {
  const stages = lessonPoints.filter((point) => point.group === 'butterfly');

  it('uses the textbook stages in the correct order', () => {
    expect(stages.map((point) => point.id)).toEqual([
      'butterfly-egg',
      'butterfly-larva',
      'butterfly-pupa',
      'butterfly-adult',
    ]);
  });

  it.each([0, 1, 2, 3])('shows the authored explanation and quiz for stage %i', (stage) => {
    const markup = renderToStaticMarkup(createElement(ButterflySimulation, {
      stage,
      onStageChange: () => undefined,
      onShowBook: () => undefined,
      onNarrate: () => undefined,
    }));
    const point = stages[stage];
    expect(markup).toContain(point.title);
    expect(markup).toContain(guidedStages[point.id].explanation);
    expect(markup).toContain(guidedStages[point.id].question);
    expect(markup).toContain('شاهد دورة الحياة');
  });
});
