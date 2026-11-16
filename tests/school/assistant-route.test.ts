import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createResponse } = vi.hoisted(() => ({ createResponse: vi.fn() }));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    responses = { create: createResponse };
  },
}));

import { GET, POST } from '@/app/api/school/ask/route';

function ask(body: Record<string, unknown>) {
  return POST(new NextRequest('http://localhost/api/school/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('school assistant API', () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.SCHOOL_OPENAI_MODEL;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.SCHOOL_OPENAI_MODEL;
    createResponse.mockReset();
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.SCHOOL_OPENAI_MODEL;
    else process.env.SCHOOL_OPENAI_MODEL = previousModel;
  });

  it('reports missing configuration without exposing credentials or contacting the model', async () => {
    const status = await GET();
    expect((await status.json()).ready).toBe(false);
    const response = await ask({ question: 'ما هي اليرقة؟', page: 73 });
    expect(response.status).toBe(503);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('sends the currently explored stage, answer and limited history using a server-held key', async () => {
    process.env.OPENAI_API_KEY = 'test-placeholder-not-real';
    process.env.SCHOOL_OPENAI_MODEL = 'gpt-4.1-mini';
    createResponse.mockResolvedValueOnce({ output_text: 'اليرقة تتغذى على أوراق النبات.' });

    const response = await ask({
      question: 'لماذا تأكل كثيراً؟',
      page: 73,
      pointId: 'butterfly-larva',
      mode: 'simulation',
      discoveryShown: true,
      quizChoice: 1,
      history: [{ role: 'assistant', content: 'لنتعلم معاً' }, { role: 'user', content: 'رأيت اليرقة' }],
    });

    expect(response.status).toBe(200);
    expect((await response.json()).answer).toContain('اليرقة');
    const request = createResponse.mock.calls[0][0];
    expect(request.model).toBe('gpt-4.1-mini');
    expect(request.store).toBe(false);
    expect(request.instructions).toContain('صفحة');
    expect(request.instructions).toContain('ضغط الطالب على زر الاستكشاف في المشهد الحالي: نعم');
    expect(request.input).toEqual([
      { role: 'assistant', content: 'لنتعلم معاً' },
      { role: 'user', content: 'رأيت اليرقة' },
      { role: 'user', content: 'لماذا تأكل كثيراً؟' },
    ]);
  });

  it('rejects invalid questions before calling the model', async () => {
    process.env.OPENAI_API_KEY = 'test-placeholder-not-real';
    const response = await ask({ question: ' ', page: 73 });
    expect(response.status).toBe(400);
    expect(createResponse).not.toHaveBeenCalled();
  });
});
