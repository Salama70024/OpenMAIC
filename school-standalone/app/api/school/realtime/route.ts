import { NextRequest, NextResponse } from 'next/server';
import { buildSchoolVoiceInstructions, parseVoiceSnapshot } from '@/lib/school/voice-instructions';
import { schoolVoiceTools } from '@/lib/school/voice-actions';

export const runtime = 'nodejs';

type Body = Record<string, unknown>;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'المحادثة الصوتية تحتاج إلى مفتاح OpenAI على الخادم.' }, { status: 503 });

  let body: Body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) throw new Error('Request too large');
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid data');
    body = value as Body;
  } catch {
    return NextResponse.json({ error: 'بيانات الدرس غير صالحة.' }, { status: 400 });
  }

  const snapshot = parseVoiceSnapshot(body);
  if (!snapshot) return NextResponse.json({ error: 'رقم صفحة الدرس غير صالح.' }, { status: 400 });

  const model = process.env.SCHOOL_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
  try {
    const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: 60 },
        session: {
          type: 'realtime',
          model,
          instructions: buildSchoolVoiceInstructions(snapshot),
          tools: schoolVoiceTools,
          tool_choice: 'auto',
          output_modalities: ['audio'],
          audio: {
            input: {
              // Laptop microphones benefit from far-field noise filtering; the browser also enables echo cancellation.
              noise_reduction: { type: 'far_field' },
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'low',
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: 'marin', speed: 0.95 },
          },
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      console.error('[school/realtime] Token request failed with status', upstream.status);
      return NextResponse.json({ error: 'تعذر بدء الاتصال الصوتي. تحقق من دعم النموذج ورصيد API.' }, { status: 502 });
    }
    const result: { value?: unknown } = await upstream.json();
    if (typeof result.value !== 'string' || !result.value) throw new Error('Missing ephemeral token');
    return NextResponse.json({ value: result.value, model }, {
      headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' },
    });
  } catch (error) {
    console.error('[school/realtime] Connection setup failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذر إنشاء جلسة صوتية حالياً.' }, { status: 502 });
  }
}
