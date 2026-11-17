import { bookPages, lessonPoints } from './lesson';

export type SchoolVoiceAction =
  | { type: 'navigate_page'; page: number }
  | { type: 'highlight_element'; element_id: string }
  | { type: 'control_simulation'; action: 'open' | 'set_stage' | 'show_discovery' | 'hide_discovery'; stage?: number }
  | { type: 'ask_student'; question: string };

const availablePages = bookPages.map((page) => page.page);
const availablePoints = lessonPoints.map((point) => point.id);

/** A narrow set of UI actions; the voice model never receives arbitrary browser control. */
export const schoolVoiceTools = [
  {
    type: 'function', name: 'navigate_page',
    description: 'Move the real science textbook to a lesson page. Use when the student asks to see a page or when explaining a diagram on another page. Do not claim navigation until this tool succeeds.',
    parameters: { type: 'object', properties: { page: { type: 'integer', enum: availablePages, description: 'Exact textbook page.' } }, required: ['page'], additionalProperties: false },
  },
  {
    type: 'function', name: 'highlight_element',
    description: 'Visually point to and highlight a labeled animal life-cycle stage in the actual textbook. This will also navigate to its textbook page. Call it when telling the student to look at a specific stage.',
    parameters: { type: 'object', properties: { element_id: { type: 'string', enum: availablePoints, description: 'The stage to highlight in the textbook.' } }, required: ['element_id'], additionalProperties: false },
  },
  {
    type: 'function', name: 'control_simulation',
    description: 'Open or manipulate the interactive butterfly life-cycle simulation. To show an animation/discovery, open the simulation and then use show_discovery. Set stages 1 egg, 2 caterpillar, 3 chrysalis, 4 adult butterfly.',
    parameters: { type: 'object', properties: { action: { type: 'string', enum: ['open', 'set_stage', 'show_discovery', 'hide_discovery'] }, stage: { type: 'integer', minimum: 1, maximum: 4, description: 'Required for set_stage; stage number 1 to 4.' } }, required: ['action'], additionalProperties: false },
  },
  {
    type: 'function', name: 'ask_student',
    description: 'Show an educational comprehension question on the screen for the student, while also asking it aloud. Wait for the student reply. Ask only about the verified life-cycle lesson.',
    parameters: { type: 'object', properties: { question: { type: 'string', minLength: 8, maxLength: 160, description: 'One short Arabic question for a fourth-grade student.' } }, required: ['question'], additionalProperties: false },
  },
] as const;

export function parseSchoolVoiceAction(name: unknown, argumentsJson: unknown): SchoolVoiceAction | null {
  if (typeof name !== 'string' || typeof argumentsJson !== 'string' || argumentsJson.length > 1024) return null;
  let args: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(argumentsJson);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    args = value as Record<string, unknown>;
  } catch { return null; }
  switch (name) {
    case 'navigate_page':
      return typeof args.page === 'number' && availablePages.includes(args.page) ? { type: 'navigate_page', page: args.page } : null;
    case 'highlight_element':
      return typeof args.element_id === 'string' && availablePoints.includes(args.element_id) ? { type: 'highlight_element', element_id: args.element_id } : null;
    case 'control_simulation': {
      const action = args.action;
      if (action !== 'open' && action !== 'set_stage' && action !== 'show_discovery' && action !== 'hide_discovery') return null;
      if (action === 'set_stage' && (!Number.isInteger(args.stage) || typeof args.stage !== 'number' || args.stage < 1 || args.stage > 4)) return null;
      return { type: 'control_simulation', action, ...(typeof args.stage === 'number' && Number.isInteger(args.stage) && args.stage >= 1 && args.stage <= 4 ? { stage: args.stage } : {}) };
    }
    case 'ask_student':
      return typeof args.question === 'string' && args.question.trim().length >= 8 && args.question.length <= 160
        ? { type: 'ask_student', question: args.question.trim() } : null;
    default: return null;
  }
}
