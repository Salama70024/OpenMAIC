import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/school/realtime/route';

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/school/realtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('school realtime credential endpoint', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.SCHOOL_REALTIME_MODEL;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.SCHOOL_REALTIME_MODEL;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.SCHOOL_REALTIME_MODEL;
    else process.env.SCHOOL_REALTIME_MODEL = originalModel;
    vi.unstubAllGlobals();
  });

  it('does not issue credentials when the server key is absent', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const result = await POST(createRequest({ page: 73 }));
    expect(result.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses an invalid lesson page before contacting OpenAI', async () => {
    process.env.OPENAI_API_KEY = 'test-not-a-real-secret';
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const result = await POST(createRequest({ page: 999 }));
    expect(result.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('issues only an ephemeral WebRTC key, with the specific stage and capped token lifetime', async () => {
    process.env.OPENAI_API_KEY = 'test-not-a-real-secret';
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: 'ek_test-short-lived' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstream);
    const result = await POST(createRequest({
      page: 74, pointId: 'butterfly-adult', mode: 'simulation', discoveryShown: true,
    }));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ value: 'ek_test-short-lived', model: 'gpt-realtime-2.1-mini' });
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    const [url, options] = upstream.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/realtime/client_secrets');
    expect(options.headers.Authorization).toBe('Bearer test-not-a-real-secret');
    const payload = JSON.parse(options.body);
    expect(payload.expires_after.seconds).toBe(60);
    expect(payload.session.instructions).toContain('الفراشة الكاملة');
    expect(payload.session.audio.input.turn_detection.type).toBe('semantic_vad');
    expect(payload.session.audio.output.voice).toBe('marin');
  });
});
