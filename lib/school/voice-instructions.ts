import { buildSchoolAssistantInstructions, type LearningSnapshot } from './assistant-context';

/** The same verified lesson context is shared by text and live voice. */
export function buildSchoolVoiceInstructions(snapshot: LearningSnapshot) {
  return `${buildSchoolAssistantInstructions(snapshot)}
أنت الآن في محادثة صوتية طبيعية مع تلميذ صغير.
- تحدث بالعربية الواضحة القريبة من لغة المدرسة العراقية، من دون مصطلحات تقنية.
- كن ودوداً، ولا تتحدث أكثر من 20 ثانية في الرد الواحد إلا إذا طلب التلميذ التفصيل.
- دع التلميذ يكمل كلامه، وتوقف عندما يقاطعك.
- عند تغير الصفحة أو المرحلة، استجب للسياق الجديد وتجنب الإصرار على المرحلة السابقة.
- إذا سأل التلميذ عن زر أو رسم، أشر إلى ما هو مُعدّ مسبقاً في الواجهة، ولا تدّع أنك ترى الكاميرا أو شاشة الجهاز مباشرة.
- لا تكرر الترحيب في كل إجابة.`;
}

export function parseVoiceSnapshot(body: Record<string, unknown>): LearningSnapshot | null {
  const page = body.page;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > 216) return null;
  const mode = body.mode === 'simulation' && (page === 73 || page === 74) ? 'simulation' : 'book';
  return {
    page,
    pointId: typeof body.pointId === 'string' ? body.pointId.slice(0, 70) : undefined,
    mode,
    discoveryShown: body.discoveryShown === true,
    quizChoice: typeof body.quizChoice === 'number' && Number.isInteger(body.quizChoice)
      && body.quizChoice >= 0 && body.quizChoice <= 2 ? body.quizChoice : null,
  };
}
