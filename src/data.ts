import type { Board, Note, ThreadMeta, Workspace } from './types';

const now = Date.now();

const thread = (
  id: string,
  label: string,
  short: string,
  summary: string,
  color: string,
): ThreadMeta => ({ id, label, short, summary, color });

const note = (
  id: string,
  text: string,
  kind: Note['kind'],
  threadId: string,
  x: number,
  y: number,
  width = 236,
  author?: string,
): Note => ({ id, text, kind, threadId, x, y, width, author, createdAt: now });

const attentionThreads = [
  thread(
    'capital',
    'Attention as capital',
    'Capital',
    'Attention behaves like a finite budget — something you spend, save, and protect.',
    '#B9E44B',
  ),
  thread(
    'interruption',
    'The interruption tax',
    'Interruption',
    'Every ping charges a fee that compounds long after the alert disappears.',
    '#FF7A59',
  ),
  thread(
    'calm',
    'Calm as a stance',
    'Calm',
    'Depth is designed by subtraction: ambient signals, protected boredom, fewer demands.',
    '#7FB2FF',
  ),
];

const slowThreads = [
  thread(
    'pace',
    'Pace over speed',
    'Pace',
    'The useful question is not how fast a tool is, but what tempo it invites.',
    '#B9E44B',
  ),
  thread(
    'defaults',
    'The cost of defaults',
    'Defaults',
    'A default is a decision made on someone else’s behalf, ten thousand times a day.',
    '#FFB657',
  ),
];

const studioThreads = [
  thread(
    'feeling',
    'Feeling first',
    'Feeling',
    'Taste is a decision made before it can be justified. Structure follows the feeling.',
    '#FF7A59',
  ),
  thread(
    'less',
    'The discipline of less',
    'Less',
    'Craft is mostly the confidence to remove what the work does not need.',
    '#7FB2FF',
  ),
];

const attentionNotes = [
  note('a1', 'Attention is the only currency that can’t be printed.', 'thought', 'capital', 40, 118, 232),
  note(
    'a2',
    'A wealth of information creates a poverty of attention.',
    'quote',
    'capital',
    40,
    418,
    238,
    'Herbert Simon',
  ),
  note('a3', 'Attention isn’t scarce. Intention is.', 'thought', 'capital', 40, 268, 224),
  note(
    'a4',
    'What if we measured attention recovered, not captured?',
    'question',
    'capital',
    40,
    602,
    238,
  ),
  note('a5', 'Every feed is a slot machine tuned to the next pull.', 'thought', 'interruption', 330, 136, 230),
  note(
    'a6',
    'The average knowledge worker checks messages every 6 minutes.',
    'source',
    'interruption',
    330,
    436,
    234,
    'Gloria Mark · Attention Span',
  ),
  note('a7', 'Metrics optimize for time spent, not value created.', 'thought', 'interruption', 330, 286, 232),
  note(
    'a8',
    'The best interfaces respect the cost of an interruption.',
    'thought',
    'interruption',
    330,
    610,
    228,
  ),
  note(
    'a9',
    'Calm technology informs at the periphery, without demanding the center.',
    'source',
    'calm',
    620,
    126,
    240,
    'Amber Case',
  ),
  note('a10', 'Designing for depth means choosing what to leave out.', 'thought', 'calm', 620, 306, 232),
  note('a11', 'Ambient awareness over urgent alerts.', 'thought', 'calm', 620, 456, 224),
  note('a12', 'Boredom is an interface worth protecting.', 'thought', 'calm', 620, 606, 228),
];

const slowNotes = [
  note('s1', 'Slow technology is less about speed, more about pace.', 'thought', 'pace', 40, 116, 240),
  note('s2', 'A tool should leave you with more attention than it found.', 'quote', 'pace', 310, 96, 250),
  note('s3', 'What if software had a closing time?', 'question', 'pace', 590, 118, 240),
  note('s4', 'Defaults are the quietest form of design.', 'thought', 'defaults', 40, 390, 238),
  note('s5', 'Every feature is a request for a habit.', 'thought', 'defaults', 310, 376, 236),
  note('s6', 'The best notification is the one never sent.', 'quote', 'defaults', 580, 386, 248),
];

const studioNotes = [
  note('p1', 'Start with the feeling, then find the structure.', 'thought', 'feeling', 40, 112, 246),
  note('p2', 'Clarity is a form of generosity.', 'quote', 'feeling', 318, 96, 238),
  note('p3', 'What would this look like if it were inevitable?', 'question', 'feeling', 594, 120, 238),
  note('p4', 'Craft is the accumulation of small refusals.', 'thought', 'less', 40, 390, 240),
  note('p5', 'Make the first minute feel like the tenth.', 'thought', 'less', 310, 378, 238),
  note('p6', 'What are we protecting by saying no?', 'question', 'less', 580, 388, 236),
];

export const initialBoards: Board[] = [
  {
    id: 'attention',
    name: 'Attention, reclaimed',
    description: 'A working theory of attention as a design material.',
    color: '#B9E44B',
    notes: attentionNotes,
    threads: attentionThreads,
    throughline: 'Attention isn’t a resource to capture. It’s a condition to protect.',
    tensionTitle: 'Capture vs. recovery',
    tension:
      'The same metrics that make attention visible also teach teams to capture more of it.',
    openQuestion: 'What would change if the success metric were attention recovered, not time spent?',
    createdAt: now - 1000 * 60 * 60 * 26,
  },
  {
    id: 'slow',
    name: 'Slow technology',
    description: 'Notes toward tools that give time back.',
    color: '#FFB657',
    notes: slowNotes,
    threads: slowThreads,
    throughline: 'Good tools don’t ask for more time. They give it back.',
    tensionTitle: 'Pace vs. engagement',
    tension: 'The product wants a slower tempo; the business model still rewards frequency.',
    openQuestion: 'Could a tool be judged by the hours it returns rather than the hours it holds?',
    createdAt: now - 1000 * 60 * 60 * 72,
  },
  {
    id: 'studio',
    name: 'Studio principles',
    description: 'What we believe before the brief arrives.',
    color: '#FF7A59',
    notes: studioNotes,
    threads: studioThreads,
    throughline: 'Taste is a decision made before it can be justified.',
    tensionTitle: 'Inevitable vs. original',
    tension:
      'The work gets stronger as it becomes obvious, but the ego wants it to remain surprising.',
    openQuestion: 'How do we protect the strange first idea without mistaking novelty for quality?',
    createdAt: now - 1000 * 60 * 60 * 168,
  },
];

export const initialWorkspace: Workspace = {
  boards: initialBoards,
  activeBoardId: 'attention',
};

export const noteKindLabel: Record<Note['kind'], string> = {
  thought: 'Thought',
  question: 'Question',
  quote: 'Quote',
  source: 'Source',
};

export const threadPalette = ['#B9E44B', '#FF7A59', '#7FB2FF', '#FFB657', '#C79BFF'];

export const suggestedQuestions = [
  'What’s the throughline?',
  'Where is the tension?',
  'What should I do next?',
];
