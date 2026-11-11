import type { Locale } from './messages';
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

const englishBoards: Board[] = [
  {
    id: 'attention',
    name: 'Attention, reclaimed',
    description: 'A working theory of attention as a design material.',
    color: '#B9E44B',
    notes: [
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
        626,
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
    ],
    threads: [
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
    ],
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
    notes: [
      note('s1', 'Slow technology is less about speed, more about pace.', 'thought', 'pace', 40, 116, 240),
      note('s2', 'A tool should leave you with more attention than it found.', 'quote', 'pace', 310, 96, 250),
      note('s3', 'What if software had a closing time?', 'question', 'pace', 590, 118, 240),
      note('s4', 'Defaults are the quietest form of design.', 'thought', 'defaults', 40, 390, 238),
      note('s5', 'Every feature is a request for a habit.', 'thought', 'defaults', 310, 376, 236),
      note('s6', 'The best notification is the one never sent.', 'quote', 'defaults', 580, 386, 248),
    ],
    threads: [
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
    ],
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
    notes: [
      note('p1', 'Start with the feeling, then find the structure.', 'thought', 'feeling', 40, 112, 246),
      note('p2', 'Clarity is a form of generosity.', 'quote', 'feeling', 318, 96, 238),
      note('p3', 'What would this look like if it were inevitable?', 'question', 'feeling', 594, 120, 238),
      note('p4', 'Craft is the accumulation of small refusals.', 'thought', 'less', 40, 390, 240),
      note('p5', 'Make the first minute feel like the tenth.', 'thought', 'less', 310, 378, 238),
      note('p6', 'What are we protecting by saying no?', 'question', 'less', 580, 388, 236),
    ],
    threads: [
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
    ],
    throughline: 'Taste is a decision made before it can be justified.',
    tensionTitle: 'Inevitable vs. original',
    tension:
      'The work gets stronger as it becomes obvious, but the ego wants it to remain surprising.',
    openQuestion: 'How do we protect the strange first idea without mistaking novelty for quality?',
    createdAt: now - 1000 * 60 * 60 * 168,
  },
];

const chineseBoards: Board[] = [
  {
    id: 'attention',
    name: '重获注意力',
    description: '把注意力当作设计材料的一份工作理论。',
    color: '#B9E44B',
    notes: [
      note('a1', '注意力是唯一无法印制的货币。', 'thought', 'capital', 40, 118, 232),
      note(
        'a2',
        '信息的丰盛，制造了注意力的贫困。',
        'quote',
        'capital',
        40,
        418,
        238,
        '赫伯特·西蒙',
      ),
      note('a3', '稀缺的不是注意力，而是意图。', 'thought', 'capital', 40, 268, 224),
      note('a4', '如果我们衡量的是恢复的注意力，而不是被捕获的注意力，会怎样？', 'question', 'capital', 40, 602, 238),
      note('a5', '每一条信息流都是调校好的老虎机，等着你下一次拉动。', 'thought', 'interruption', 330, 136, 230),
      note(
        'a6',
        '知识工作者平均每 6 分钟查看一次消息。',
        'source',
        'interruption',
        330,
        436,
        234,
        '格洛丽亚·马克 ·《注意力跨度》',
      ),
      note('a7', '指标优化的是停留时长，而不是创造的价值。', 'thought', 'interruption', 330, 286, 232),
      note('a8', '最好的界面，尊重一次打断的代价。', 'thought', 'interruption', 330, 626, 228),
      note(
        'a9',
        '平静技术只在边缘告知，而不占据中心。',
        'source',
        'calm',
        620,
        126,
        240,
        '安柏·凯斯',
      ),
      note('a10', '设计深度，就是选择把什么留在外面。', 'thought', 'calm', 620, 306, 232),
      note('a11', '环境式感知，胜过紧急提醒。', 'thought', 'calm', 620, 456, 224),
      note('a12', '无聊是一种值得被保护的界面。', 'thought', 'calm', 620, 606, 228),
    ],
    threads: [
      thread(
        'capital',
        '注意力作为资本',
        '资本',
        '注意力像一笔有限的预算——被你花掉、存下，也值得被保护。',
        '#B9E44B',
      ),
      thread(
        'interruption',
        '打断的税',
        '打断',
        '每一次提示音都在收费，而账单在提醒消失很久之后仍在累积。',
        '#FF7A59',
      ),
      thread(
        'calm',
        '平静是一种立场',
        '平静',
        '深度来自做减法：环境式信号、被保护的无聊、更少的要求。',
        '#7FB2FF',
      ),
    ],
    throughline: '注意力不是用来捕获的资源，而是一种需要被保护的状态。',
    tensionTitle: '捕获 vs. 恢复',
    tension: '让注意力变得可见的同一套指标，也在教团队如何捕获更多注意力。',
    openQuestion: '如果成功指标是恢复的注意力，而不是花费的时间，会有什么改变？',
    createdAt: now - 1000 * 60 * 60 * 26,
  },
  {
    id: 'slow',
    name: '缓慢技术',
    description: '关于把时间还给人的工具的笔记。',
    color: '#FFB657',
    notes: [
      note('s1', '缓慢技术与其说关乎速度，不如说关乎节奏。', 'thought', 'pace', 40, 116, 240),
      note('s2', '一个好的工具，应该让你在离开时拥有比开始时更多的注意力。', 'quote', 'pace', 310, 96, 250),
      note('s3', '如果软件也有打烊时间，会怎样？', 'question', 'pace', 590, 118, 240),
      note('s4', '默认值是最安静的一种设计。', 'thought', 'defaults', 40, 390, 238),
      note('s5', '每一个功能，都是对一种习惯的请求。', 'thought', 'defaults', 310, 376, 236),
      note('s6', '最好的通知，是那条从未发出的通知。', 'quote', 'defaults', 580, 386, 248),
    ],
    threads: [
      thread(
        'pace',
        '节奏高于速度',
        '节奏',
        '有用的问题不是工具多快，而是它邀请怎样的节奏。',
        '#B9E44B',
      ),
      thread(
        'defaults',
        '默认值的代价',
        '默认',
        '默认值是替别人做出的决定，一天重复一万次。',
        '#FFB657',
      ),
    ],
    throughline: '好的工具不会索取更多时间，而是把时间还给你。',
    tensionTitle: '节奏 vs. 参与度',
    tension: '产品想要更慢的节奏，商业模式却仍在奖励更高的频率。',
    openQuestion: '一个工具能否以它归还的小时数来衡量，而不是它占据的小时数？',
    createdAt: now - 1000 * 60 * 60 * 72,
  },
  {
    id: 'studio',
    name: '工作室原则',
    description: '在简报到来之前，我们相信什么。',
    color: '#FF7A59',
    notes: [
      note('p1', '从感受开始，再寻找结构。', 'thought', 'feeling', 40, 112, 246),
      note('p2', '清晰是一种慷慨。', 'quote', 'feeling', 318, 96, 238),
      note('p3', '如果这件事注定发生，它会是什么样子？', 'question', 'feeling', 594, 120, 238),
      note('p4', '手艺，是一次次微小拒绝的累积。', 'thought', 'less', 40, 390, 240),
      note('p5', '让第一分钟的感觉，像第十分钟一样。', 'thought', 'less', 310, 378, 238),
      note('p6', '说“不”的时候，我们在保护什么？', 'question', 'less', 580, 388, 236),
    ],
    threads: [
      thread(
        'feeling',
        '感受优先',
        '感受',
        '品味是在能够解释之前做出的决定。结构追随感受。',
        '#FF7A59',
      ),
      thread(
        'less',
        '少即是功夫',
        '减法',
        '手艺主要是那份自信：删掉作品不需要的东西。',
        '#7FB2FF',
      ),
    ],
    throughline: '品味是在能够解释之前做出的决定。',
    tensionTitle: '必然 vs. 原创',
    tension: '作品越显而易见就越有力，但自我却希望它始终保持意外。',
    openQuestion: '我们如何保护最初那个奇怪的想法，又不把新奇误认为质量？',
    createdAt: now - 1000 * 60 * 60 * 168,
  },
];

export const seedBoards: Record<Locale, Board[]> = {
  en: englishBoards,
  zh: chineseBoards,
};

export const threadPalette = ['#B9E44B', '#FF7A59', '#7FB2FF', '#FFB657', '#C79BFF'];

export function initialWorkspaceFor(locale: Locale): Workspace {
  return {
    boards: structuredClone(seedBoards[locale]),
    activeBoardId: 'attention',
  };
}

const defaultBoardNames = new Set(['Untitled canvas', '未命名画布']);
const defaultBoardDescriptions = new Set(['A new place to think.', '一块新的思考之地。']);

/**
 * Re-localises seed content without overwriting anything the user has edited.
 * Notes are only translated when their text still matches a known seed variant.
 */
export function localizeWorkspace(workspace: Workspace, locale: Locale): Workspace {
  const targets = seedBoards[locale];
  const allSeeds = [...seedBoards.en, ...seedBoards.zh];

  return {
    ...workspace,
    boards: workspace.boards.map((board) => {
      const target = targets.find((item) => item.id === board.id);
      if (!target) {
        if (board.id.startsWith('canvas-')) {
          const name = defaultBoardNames.has(board.name)
            ? locale === 'zh'
              ? '未命名画布'
              : 'Untitled canvas'
            : board.name;
          const description = defaultBoardDescriptions.has(board.description)
            ? locale === 'zh'
              ? '一块新的思考之地。'
              : 'A new place to think.'
            : board.description;
          return {
            ...board,
            name,
            description,
            threads: board.threads.map((thread) => ({ ...thread, isDynamic: true })),
          };
        }
        return board;
      }

      const variants = allSeeds.filter((item) => item.id === board.id);
      const matches = (value: string, read: (item: Board) => string) =>
        variants.some((item) => read(item) === value);

      const notes = board.notes.map((item) => {
        const targetNote = target.notes.find((candidate) => candidate.id === item.id);
        if (!targetNote) return item;
        const noteVariants = variants
          .flatMap((candidate) => candidate.notes)
          .filter((candidate) => candidate.id === item.id);
        const textMatches = noteVariants.some((candidate) => candidate.text === item.text);
        const authorMatches = noteVariants.some(
          (candidate) => (candidate.author ?? '') === (item.author ?? ''),
        );
        return {
          ...item,
          text: textMatches ? targetNote.text : item.text,
          author: authorMatches ? targetNote.author : item.author,
        };
      });

      const threads = board.threads.map((item) => {
        const targetThread = target.threads.find((candidate) => candidate.id === item.id);
        return targetThread
          ? {
              ...item,
              ...targetThread,
              isDynamic: false,
            }
          : { ...item, isDynamic: true };
      });

      return {
        ...board,
        name: matches(board.name, (item) => item.name) ? target.name : board.name,
        description: target.description,
        notes,
        threads,
        throughline: target.throughline,
        tensionTitle: target.tensionTitle,
        tension: target.tension,
        openQuestion: target.openQuestion,
      };
    }),
  };
}
