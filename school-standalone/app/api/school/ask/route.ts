import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildSchoolAssistantInstructions, type LearningMode } from '@/lib/school/assistant-context';

export const runtime = 'nodejs';

type QuestionBody = {
  question?: unknown;
  page?: unknown;
  pointId?: unknown;
  mode?: unknown;
  discoveryShown?: unknown;
  quizChoice?: unknown;
  history?: unknown;
};

const MAX_HISTORY_ITEMS = 6;

export async function GET() {
  return NextResponse.json({ ready: Boolean(process.env.OPENAI_API_KEY) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'المساعد غير مهيأ بعد. يحتاج إلى مفتاح OpenAI على الخادم.' }, { status: 503 });
  }

  let body: QuestionBody;
  try {
    body = (await request.json()) as QuestionBody;
  } catch {
    return NextResponse.json({ error: 'الطلب غير صالح.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const page = typeof body.page === 'number' && Number.isInteger(body.page) ? body.page : 73;
  const pointId = typeof body.pointId === 'string' ? body.pointId : undefined;
  if (!question || question.length > 600 || page < 1 || page > 216) {
    return NextResponse.json({ error: 'أدخل سؤالاً قصيراً وحدد صفحة صحيحة.' }, { status: 400 });
  }

  const mode: LearningMode = body.mode === 'simulation' && page >= 73 && page <= 74 ? 'simulation' : 'book';
  const discoveryShown = body.discoveryShown === true;
  const quizChoice = typeof body.quizChoice === 'number' && Number.isInteger(body.quizChoice)
    && body.quizChoice >= 0 && body.quizChoice <= 2 ? body.quizChoice : null;
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_ITEMS).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const turn = item as Record<string, unknown>;
    if ((turn.role !== 'user' && turn.role !== 'assistant') || typeof turn.content !== 'string') return [];
    const content = turn.content.trim().slice(0, 500);
    return content ? [{ role: turn.role as 'user' | 'assistant', content }] : [];
  }) : [];
  const instructions = buildSchoolAssistantInstructions({ page, pointId, mode, discoveryShown, quizChoice });
  const config = process.env.SCHOOL_OPENAI_MODEL || process.env.DEFAULT_MODEL || 'openai:gpt-5.6';
  const model = config.startsWith('openai:') ? config.slice('openai:'.length)
    : config.includes(':') ? 'gpt-5.6' : config;

  try {
    const openai = new OpenAI({ apiKey: key, timeout: 30000, maxRetries: 1 });
    const response = await openai.responses.create({
      model,
      instructions,
      input: [...history, { role: 'user' as const, content: question }],
      store: false,
      max_output_tokens: 900,
    });
    const answer = response.output_text?.trim();
    if (!answer) throw new Error('EMPTY_ANSWER');
    return NextResponse.json({ answer });
  } catch (error) {
    const issue = error instanceof Error ? error.message : 'Unknown OpenAI error';
    console.error('[school/ask] Failed:', issue);
    return NextResponse.json({ error: 'تعذر توليد الإجابة حالياً. تأكد من صلاحية النموذج ورصيد API.' }, { status: 502 });
  }
}
