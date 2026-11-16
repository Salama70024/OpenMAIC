import { readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getSchoolNarrationText } from '@/lib/school/narration';

export const runtime = 'nodejs';

const AUDIO_HEADERS = {
  'Content-Type': 'audio/mpeg',
  'Cache-Control': 'public, max-age=86400, s-maxage=604800',
  'X-Content-Type-Options': 'nosniff',
};

// Avoid repeated billable generations in a warm server process.
const generatedAudio = new Map<string, Promise<Uint8Array<ArrayBuffer>>>();

async function audioFor(id: string, text: string) {
  const cached = generatedAudio.get(id);
  if (cached) return cached;

  const pending = (async () => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30000, maxRetries: 1 });
    const audio = await client.audio.speech.create({
      model: process.env.SCHOOL_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: 'marin',
      input: text,
      instructions: 'اقرأ النص العربي كما هو، بصوت معلم لطيف وواضح، بوتيرة هادئة مناسبة لتلاميذ الصف الرابع، دون إضافة أي كلام.',
      response_format: 'mp3',
      speed: 0.95,
    });
    return new Uint8Array(await audio.arrayBuffer());
  })();

  generatedAudio.set(id, pending);
  try {
    return await pending;
  } catch (error) {
    generatedAudio.delete(id);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') || '';
  const text = getSchoolNarrationText(id);
  if (!text) return NextResponse.json({ error: 'المقطع الصوتي غير موجود.' }, { status: 404 });

  // Teacher-approved recordings have priority as soon as they are added to the project.
  // The ID is allowlisted above, so it cannot be used to escape this directory.
  try {
    const file = await readFile(path.join(process.cwd(), 'public', 'school', 'audio', `${id}.mp3`));
    return new Response(file, { headers: AUDIO_HEADERS });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[school/narration] Audio file unavailable:', error instanceof Error ? error.message : error);
      return NextResponse.json({ error: 'تعذر قراءة تسجيل الشرح.' }, { status: 500 });
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'لا يوجد تسجيل لهذا الدرس، وخدمة توليد الصوت غير مهيأة.' }, { status: 503 });
  }

  try {
    const audio = await audioFor(id, text);
    return new Response(audio, { headers: AUDIO_HEADERS });
  } catch (error) {
    console.error('[school/narration] Generation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذر تجهيز التسجيل الصوتي حالياً.' }, { status: 502 });
  }
}
