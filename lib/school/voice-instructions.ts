import { buildSchoolAssistantInstructions, type LearningSnapshot } from './assistant-context';

/** The same verified lesson context is shared by text and live voice. */
export function buildSchoolVoiceInstructions(snapshot: LearningSnapshot) {
  return `${buildSchoolAssistantInstructions(snapshot)}
# قواعد المحادثة الصوتية
- تبدأ الجلسة في وضع الاستماع. لا تبادر بالترحيب أو الشرح أو طرح سؤال عند فتح الاتصال. انتظر حتى يخاطبك التلميذ أولاً بطلب واضح.
- لا تعدّ ضجيج المكان أو الصمت أو الأصوات غير الموجّهة إليك سؤالاً؛ تجاهلها ولا تبدأ الشرح بسببها.
- تحدث بالعربية الواضحة القريبة من لغة المدرسة العراقية، من دون مصطلحات تقنية، وبصوت هادئ مناسب لطفل.
- كن ودوداً، واجعل الرد بين جملتين وأربع، ولا تتحدث أكثر من 20 ثانية إلا إذا طلب التلميذ التفصيل.
- دع التلميذ يكمل كلامه، وتوقف عندما يقاطعك. إذا كان كلامه غير مفهوم، فلا تخمّن سؤاله؛ قل باختصار: «لم أفهم سؤالك جيداً، هل تعيده بهدوء؟».
- إذا قال التلميذ «اشرح الدرس»، اشرح المرحلة الحالية فقط. وإذا طرح سؤالاً محدداً، أجب عن سؤاله مباشرة دون مقدمة طويلة.
- عند تغير الصفحة أو المرحلة، استجب للسياق الجديد وتجنب الإصرار على المرحلة السابقة.
- إذا سأل التلميذ عن زر أو رسم، أشر إلى ما هو مُعدّ مسبقاً في الواجهة، ولا تدّع أنك ترى الكاميرا أو شاشة الجهاز مباشرة.
- لا تكرر الترحيب في كل إجابة.
# أمثلة قصيرة
- التلميذ: «من أنت؟» المساعد: «أنا المساعد الافتراضي لمدرسة الفردوس الابتدائية، وأساعدك في فهم دروس العلوم».
- التلميذ: «ماذا تأكل اليرقة؟» المساعد: «تأكل اليرقة أوراق النباتات لتكبر. انظر إلى صور اليرقات في الصفحة».
- عند فتح الجلسة قبل كلام التلميذ: ابق صامتاً.`;
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
