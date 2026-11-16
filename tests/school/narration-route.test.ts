import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createSpeech, readAudio } = vi.hoisted(() => ({ createSpeech: vi.fn(), readAudio: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile: readAudio }));
vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = { speech: { create: createSpeech } };
  },
}));

import { GET } from '@/app/api/school/narration/route';

function request(id: string) {
  return new NextRequest(`http://localhost/api/school/narration?id=${encodeURIComponent(id)}`);
}

describe('approved lesson narration endpoint', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    createSpeech.mockReset();
    readAudio.mockReset();
    readAudio.mockRejectedValue(Object.assign(new Error('not found'), { code: 'ENOENT' }));
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it('rejects unapproved audio IDs without a model call', async () => {
    const result = await GET(request('../outside'));
    expect(result.status).toBe(404);
    expect(createSpeech).not.toHaveBeenCalled();
  });

  it('prefers a preapproved MP3 recording when available, even without API credentials', async () => {
    readAudio.mockResolvedValue(Buffer.from([1, 2, 3]));
    const result = await GET(request('butterfly-egg'));
    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(Array.from(new Uint8Array(await result.arrayBuffer()))).toEqual([1, 2, 3]);
    expect(createSpeech).not.toHaveBeenCalled();
  });

  it('synthesizes only preauthored content if no recording exists', async () => {
    process.env.OPENAI_API_KEY = 'fake-test-key';
    createSpeech.mockResolvedValue({ arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer });
    const result = await GET(request('frog-tadpole'));
    expect(result.status).toBe(200);
    expect(Array.from(new Uint8Array(await result.arrayBuffer()))).toEqual([4, 5, 6]);
    const argumentsToSpeech = createSpeech.mock.calls[0][0];
    expect(argumentsToSpeech.input).toContain('أبو ذنيبة');
    expect(argumentsToSpeech.model).toBe('gpt-4o-mini-tts');
    expect(argumentsToSpeech.voice).toBe('marin');
  });
});
