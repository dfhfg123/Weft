import type { Analysis, AskResult, Board, Connection, Note, ThreadMeta, ThreadView } from './types';
import type { Locale } from './messages';
import { translate } from './messages';
import { threadPalette } from './data';

const STOP_WORDS = new Set(
  `a about above after again against all also am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves`.split(
    /\s+/,
  ),
);

const CONCEPTS: Record<string, string> = {
  attention: 'attention',
  attentive: 'attention',
  intention: 'intention',
  intentional: 'intention',
  focus: 'focus',
  focused: 'focus',
  notice: 'attention',
  awareness: 'attention',
  aware: 'attention',
  mind: 'attention',
  cognitive: 'attention',
  currency: 'economy',
  capital: 'economy',
  scarcity: 'economy',
  scarce: 'economy',
  economy: 'economy',
  economic: 'economy',
  value: 'economy',
  cost: 'economy',
  budget: 'economy',
  metric: 'measurement',
  metrics: 'measurement',
  measure: 'measurement',
  measured: 'measurement',
  spend: 'economy',
  expensive: 'economy',
  wealth: 'economy',
  price: 'economy',
  market: 'economy',
  print: 'economy',
  interruption: 'interruption',
  interruptions: 'interruption',
  notification: 'interruption',
  notifications: 'interruption',
  alert: 'interruption',
  alerts: 'interruption',
  message: 'interruption',
  messages: 'interruption',
  ping: 'interruption',
  urgent: 'interruption',
  inbox: 'interruption',
  demand: 'interruption',
  demands: 'interruption',
  feed: 'feed',
  scroll: 'feed',
  algorithm: 'feed',
  machine: 'feed',
  infinite: 'feed',
  slot: 'feed',
  pull: 'feed',
  calm: 'calm',
  ambient: 'calm',
  periphery: 'calm',
  quiet: 'calm',
  boredom: 'calm',
  bored: 'calm',
  slow: 'pace',
  pace: 'pace',
  tempo: 'pace',
  fast: 'pace',
  speed: 'pace',
  depth: 'depth',
  deep: 'depth',
  subtract: 'depth',
  subtraction: 'depth',
  out: 'depth',
  protect: 'protection',
  protected: 'protection',
  protecting: 'protection',
  design: 'design',
  designed: 'design',
  designing: 'design',
  interface: 'design',
  product: 'design',
  experience: 'design',
  tool: 'tool',
  tools: 'tool',
  software: 'tool',
  feature: 'tool',
  default: 'design',
  defaults: 'design',
  information: 'information',
  data: 'information',
  content: 'information',
  knowledge: 'information',
  signal: 'information',
  noise: 'information',
  time: 'time',
  minute: 'time',
  minutes: 'time',
  hours: 'time',
  closing: 'time',
  craft: 'craft',
  taste: 'craft',
  clarity: 'clarity',
  clear: 'clarity',
  generous: 'clarity',
  generosity: 'clarity',
  feeling: 'feeling',
  inevitable: 'feeling',
  original: 'feeling',
  structure: 'structure',
  habit: 'habit',
  habits: 'habit',
  frequency: 'habit',
  engage: 'habit',
  engagement: 'habit',
};

const CONCEPT_WORDS: Record<string, string[]> = {
  attention: ['attention', 'focus', 'intention'],
  economy: ['attention', 'value', 'measurement'],
  interruption: ['interruption', 'feed', 'time'],
  feed: ['feed', 'interruption', 'habit'],
  calm: ['calm', 'depth', 'protection'],
  depth: ['depth', 'calm', 'focus'],
  design: ['design', 'tool', 'craft'],
  craft: ['craft', 'clarity', 'feeling'],
  tool: ['tool', 'pace', 'habit'],
  information: ['information', 'attention', 'measurement'],
  time: ['time', 'pace', 'habit'],
};

export function tokenize(text: string): string[] {
  const latin = text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map((word) => word.replace(/(ing|ed|ly|s)$/, ''))
    .filter(Boolean);

  const cjk: string[] = [];
  for (const run of text.match(/[\u3400-\u9fff]+/g) ?? []) {
    const chars = [...run];
    if (chars.length === 1) {
      cjk.push(chars[0]);
      continue;
    }
    for (let index = 0; index < chars.length - 1; index += 1) {
      const bigram = chars[index] + chars[index + 1];
      if (!CJK_STOP_BIGRAMS.has(bigram)) cjk.push(bigram);
    }
  }
  return [...latin, ...cjk];
}

export function conceptsFor(text: string): string[] {
  const tokens = tokenize(text);
  const concepts = new Set<string>();
  for (const token of tokens) {
    if (CONCEPTS[token]) concepts.add(CONCEPTS[token]);
    else if (token.length > 4) {
      const stem = token.slice(0, Math.max(4, token.length - 1));
      for (const [key, concept] of Object.entries(CONCEPTS)) {
        if (key.startsWith(stem) || stem.startsWith(key.slice(0, 5))) {
          concepts.add(concept);
          break;
        }
      }
    }
  }
  for (const [term, concept] of ZH_TERM_TO_CONCEPT) {
    if (text.includes(term)) concepts.add(concept);
  }
  return [...concepts];
}

const CJK_STOP_BIGRAMS = new Set([
  '我们', '你们', '他们', '她们', '一个', '这个', '那个', '这些', '那些', '什么',
  '如果', '因为', '所以', '但是', '而且', '不是', '没有', '可以', '应该', '就是',
  '还在', '已经', '以及', '或者', '之间', '自己', '这样', '那样', '如何', '为什么',
  '怎么', '一种', '一条', '一块', '正在', '需要', '值得', '可能', '变得', '放在',
  '一起', '其中', '而是', '会怎样', '的时候', '是不是', '有没有', '能不能',
]);

const ZH_CONCEPTS: Array<[string, string[]]> = [
  ['attention', ['注意力', '专注', '关注', '心智', '认知', '留意', '分心']],
  ['intention', ['意图', '意愿', '有意', '目的']],
  ['focus', ['专注', '聚焦', '心流']],
  ['economy', ['货币', '资本', '稀缺', '经济', '价值', '成本', '预算', '花费', '财富', '价格', '印制', '资源']],
  ['measurement', ['指标', '衡量', '度量', '测量', '数据']],
  ['interruption', ['打断', '干扰', '通知', '提醒', '消息', '弹窗', '急事', '收件箱', '提示音']],
  ['feed', ['信息流', '推荐', '算法', '滚动', '老虎机', '无限', '上瘾']],
  ['calm', ['平静', '安静', '环境式', '边缘', '无聊', '留白', '克制']],
  ['pace', ['缓慢', '节奏', '速度', '打烊', '频率', '快', '慢']],
  ['depth', ['深度', '深入', '减法', '删掉', '舍弃']],
  ['protection', ['保护', '守护', '留出', '捍卫']],
  ['design', ['设计', '界面', '产品', '体验', '默认值', '默认', '功能']],
  ['tool', ['工具', '软件', '功能', '产品']],
  ['craft', ['手艺', '品味', '工艺', '做工', '拒绝']],
  ['clarity', ['清晰', '清楚', '慷慨', '简洁']],
  ['feeling', ['感受', '感觉', '品味', '直觉', '必然', '原创', '奇怪']],
  ['structure', ['结构', '框架', '秩序']],
  ['habit', ['习惯', '频率', '参与度', '上瘾', '重复']],
  ['information', ['信息', '数据', '内容', '知识', '信号', '噪声']],
  ['time', ['时间', '分钟', '小时', '归还']],
];

const ZH_TERM_TO_CONCEPT = new Map<string, string>();
ZH_CONCEPTS.forEach(([concept, terms]) => terms.forEach((term) => ZH_TERM_TO_CONCEPT.set(term, concept)));

function pick(locale: Locale, english: string, chinese: string): string {
  return locale === 'zh' ? chinese : english;
}

interface Vector {
  weights: Map<string, number>;
  norm: number;
}

function buildVectors(notes: Note[], boostConcepts = true): Vector[] {
  const docs = notes.map((n) => tokenize(n.text));
  const df = new Map<string, number>();
  docs.forEach((doc) => {
    new Set(doc).forEach((word) => df.set(word, (df.get(word) ?? 0) + 1));
  });

  return docs.map((doc, index) => {
    const tf = new Map<string, number>();
    doc.forEach((word) => tf.set(word, (tf.get(word) ?? 0) + 1));
    if (boostConcepts) {
      for (const concept of conceptsFor(notes[index].text)) {
        tf.set(`concept:${concept}`, (tf.get(`concept:${concept}`) ?? 0) + 1.8);
        for (const related of CONCEPT_WORDS[concept] ?? []) {
          tf.set(`concept:${related}`, (tf.get(`concept:${related}`) ?? 0) + 0.45);
        }
      }
    }
    const weights = new Map<string, number>();
    for (const [word, count] of tf) {
      const idf = Math.log((1 + notes.length) / (1 + (df.get(word) ?? 0))) + 1;
      weights.set(word, count * idf);
    }
    const norm = Math.sqrt([...weights.values()].reduce((sum, value) => sum + value * value, 0)) || 1;
    return { weights, norm };
  });
}

function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  for (const [word, weight] of a.weights) {
    const other = b.weights.get(word);
    if (other) dot += weight * other;
  }
  return dot / (a.norm * b.norm);
}

export function similarityMatrix(notes: Note[]): number[][] {
  const vectors = buildVectors(notes);
  return vectors.map((a, i) => vectors.map((b, j) => (i === j ? 1 : cosine(a, b))));
}

function normalizeLabel(word: string): string {
  const clean = word.replace(/^concept:/, '').replace(/'/g, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function deriveThreadLabelFromTexts(texts: string[], index: number, locale: Locale = 'en'): string {
  const counts = new Map<string, number>();
  texts.forEach((text) => {
    for (const concept of conceptsFor(text)) {
      counts.set(concept, (counts.get(concept) ?? 0) + 1);
    }
  });
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    if (locale === 'zh') {
      const cjk = texts
        .join(' ')
        .replace(/[^\u3400-\u9fff]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .join('');
      if (cjk.length >= 2) return `${cjk.slice(0, 4)}这条线`;
      return `未命名的线索 ${index + 1}`;
    }
    const labelStop = new Set([
      'note', 'notes', 'new', 'just', 'like', 'want', 'need', 'needs', 'make', 'made',
      'thing', 'things', 'really', 'very', 'much', 'many', 'should', 'would', 'could',
      'still', 'without', 'across', 'around', 'through', 'being', 'having', 'does',
      'doing', 'first', 'next', 'last', 'another', 'something', 'anything', 'nothing',
      'every', 'each', 'other', 'same', 'different', 'little', 'small', 'large', 'good',
      'better', 'best', 'today', 'tomorrow', 'yesterday', 'into', 'from', 'with',
    ]);
    const words = texts
      .flatMap((text) =>
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(
            (word) =>
              word.length > 3 &&
              !STOP_WORDS.has(word) &&
              !labelStop.has(word) &&
              !word.endsWith('ly'),
          ),
      )
      .filter(Boolean);
    if (words.length) return `The ${words[0]} thread`;
    return `Loose thread ${index + 1}`;
  }
  const labels: Record<string, string> = {
    attention: 'The attention thread',
    economy: 'The attention economy',
    interruption: 'The interruption tax',
    feed: 'The feed question',
    calm: 'Calm as a stance',
    depth: 'Designing for depth',
    design: 'The design question',
    craft: 'The craft thread',
    clarity: 'Clarity as a practice',
    feeling: 'Feeling first',
    tool: 'Tools with a tempo',
    pace: 'Pace over speed',
    time: 'The time question',
    information: 'Information & attention',
    habit: 'The habit loop',
    measurement: 'What gets measured',
    protection: 'What we protect',
    structure: 'Structure follows feeling',
    intention: 'Intention as the scarce thing',
  };
  const labelsZh: Record<string, string> = {
    attention: '注意力这条线',
    economy: '注意力经济',
    interruption: '打断的代价',
    feed: '信息流的问题',
    calm: '平静作为一种立场',
    depth: '为深度做减法',
    design: '设计的问题',
    craft: '手艺这条线',
    clarity: '清晰作为一种慷慨',
    feeling: '感受优先',
    tool: '有节奏的工具',
    pace: '节奏高于速度',
    time: '时间的问题',
    information: '信息与注意力',
    habit: '习惯回路',
    measurement: '被衡量的东西',
    protection: '我们要保护什么',
    structure: '结构追随感受',
    intention: '意图才是稀缺的',
  };
  if (locale === 'zh') return labelsZh[ranked[0][0]] ?? `${ranked[0][0]}这条线`;
  return labels[ranked[0][0]] ?? `${normalizeLabel(ranked[0][0])} & ${normalizeLabel(ranked[1]?.[0] ?? 'clarity')}`;
}

function deriveThreadLabel(notes: Note[], index: number, locale: Locale): string {
  return deriveThreadLabelFromTexts(notes.map((note) => note.text), index, locale);
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?。！？]/);
  return (match?.[0] ?? text).trim();
}

function shortLabel(label: string, locale: Locale): string {
  return locale === 'zh' ? label.replace(/这条线$/, '') : label.replace(/^The\s+/i, '');
}

export function createThreadMeta(
  board: Board,
  text: string,
  threadId: string,
  locale: Locale = 'en',
): ThreadMeta {
  const label = deriveThreadLabelFromTexts([text], board.threads.length, locale);
  return {
    id: threadId,
    label,
    short: shortLabel(label, locale),
    summary: firstSentence(text),
    color: threadPalette[board.threads.length % threadPalette.length],
    isDynamic: true,
  };
}

function deriveSummary(notes: Note[], locale: Locale = 'en'): string {
  if (!notes.length) return pick(locale, 'A thread waiting to be pulled.', '一条等待被拉出的线。');
  const longest = [...notes].sort((a, b) => b.text.length - a.text.length)[0];
  return firstSentence(longest.text);
}

export function analyzeBoard(board: Board, locale: Locale = 'en'): Analysis {
  const notes = board.notes;
  const groups = new Map<string, Note[]>();
  notes.forEach((note) => {
    const list = groups.get(note.threadId) ?? [];
    list.push(note);
    groups.set(note.threadId, list);
  });

  const threads: ThreadView[] = board.threads.map((meta, index) => {
    const members = groups.get(meta.id) ?? [];
    const dynamic = Boolean(meta.isDynamic);
    const dynamicLabel = dynamic
      ? deriveThreadLabelFromTexts(
          members.map((note) => note.text),
          index,
          locale,
        )
      : meta.label;
    return {
      ...meta,
      label: dynamicLabel,
      short: dynamic ? shortLabel(dynamicLabel, locale) : meta.short,
      noteIds: members.map((note) => note.id),
      isDynamic: dynamic,
      summary: meta.summary || deriveSummary(members, locale),
      color: meta.color || threadPalette[index % threadPalette.length],
    };
  });

  [...groups.keys()].forEach((threadId, index) => {
    if (board.threads.some((meta) => meta.id === threadId)) return;
    const members = groups.get(threadId) ?? [];
    threads.push({
      id: threadId,
      label: deriveThreadLabel(members, index, locale),
      short: shortLabel(deriveThreadLabel(members, index, locale), locale),
      summary: deriveSummary(members, locale),
      color: threadPalette[(board.threads.length + index) % threadPalette.length],
      noteIds: members.map((note) => note.id),
      isDynamic: true,
    });
  });

  for (const item of threads) {
    item.summary = item.isDynamic
      ? deriveSummary(groups.get(item.id) ?? [], locale)
      : item.summary || deriveSummary(groups.get(item.id) ?? [], locale);
  }

  const sortedThreads = threads
    .filter((item) => item.noteIds.length > 0)
    .sort((a, b) => {
      const aSeed = board.threads.findIndex((meta) => meta.id === a.id);
      const bSeed = board.threads.findIndex((meta) => meta.id === b.id);
      if (aSeed !== -1 || bSeed !== -1) return (aSeed === -1 ? 99 : aSeed) - (bSeed === -1 ? 99 : bSeed);
      return b.noteIds.length - a.noteIds.length;
    });

  const matrix = similarityMatrix(notes);
  const connections: Connection[] = [];
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      const strength = matrix[i][j];
      if (strength > 0.025) connections.push({ a: notes[i].id, b: notes[j].id, strength });
    }
  }
  connections.sort((a, b) => b.strength - a.strength);
  const limited = connections.slice(0, 20);

  const questionNote = notes.find((note) => note.kind === 'question');
  const tensionPair = chooseTension(notes, matrix);
  const dynamicTension = tensionPair
    ? pick(
        locale,
        `${firstSentence(tensionPair[0].text)} — against ${firstSentence(tensionPair[1].text).toLowerCase()}`,
        `${firstSentence(tensionPair[0].text)}——对抗${firstSentence(tensionPair[1].text)}`,
      )
    : questionNote
      ? firstSentence(questionNote.text)
      : pick(
          locale,
          'Add a few more notes and the live tension will surface here.',
          '再添加几条笔记，现场张力就会在这里浮现。',
        );

  return {
    threads: sortedThreads,
    connections: limited,
    noteCount: notes.length,
    throughline: board.throughline || deriveThroughline(sortedThreads, locale),
    tensionTitle: board.tensionTitle || pick(locale, 'The live tension', '现场张力'),
    tension: board.tension || dynamicTension,
    openQuestion:
      board.openQuestion ||
      questionNote?.text ||
      (sortedThreads.length > 1
        ? pick(
            locale,
            `What would connect ${sortedThreads[0].label.toLowerCase()} to ${sortedThreads[1].label.toLowerCase()}?`,
            `${sortedThreads[0].label}与${sortedThreads[1].label}之间，靠什么连接？`,
          )
        : pick(
            locale,
            'What question is this canvas trying to answer?',
            '这块画布试图回答的问题是什么？',
          )),
  };
}

function deriveThroughline(threads: ThreadView[], locale: Locale = 'en'): string {
  if (!threads.length) return pick(locale, 'Every canvas begins with a single thread.', '每一块画布，都从一条线索开始。');
  if (threads.length === 1) return threads[0].summary;
  return pick(
    locale,
    `${threads[0].label} meets ${threads[1].label.toLowerCase()}.`,
    `${threads[0].label}与${threads[1].label}相遇。`,
  );
}

function chooseTension(notes: Note[], matrix: number[][]): [Note, Note] | null {
  if (notes.length < 2) return null;
  const contrastWords =
    /\b(not|isn't|never|without|against|instead|rather|but|vs\.?|versus|less|more)\b|[不没无相反而非却但更少]/i;
  let best: { a: Note; b: Note; score: number } | null = null;
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      const a = notes[i];
      const b = notes[j];
      const contrast = Number(contrastWords.test(a.text)) + Number(contrastWords.test(b.text));
      const differentThreads = a.threadId !== b.threadId ? 1 : 0;
      const score = contrast * 1.6 + differentThreads * 0.8 - matrix[i][j] * 0.5;
      if (!best || score > best.score) best = { a, b, score };
    }
  }
  return best ? [best.a, best.b] : null;
}

function pickThreadSources(thread: ThreadView, notes: Note[]): string[] {
  return thread.noteIds.slice(0, 2).filter((id) => notes.some((note) => note.id === id));
}

function topKeywords(text: string, count = 3): string[] {
  const counts = new Map<string, number>();
  tokenize(text).forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

function retrievalAnswer(
  query: string,
  board: Board,
  analysis: Analysis,
  locale: Locale,
): AskResult {
  const notes = board.notes;
  const queryTokens = tokenize(query);
  if (!notes.length) {
    return {
      text: pick(
        locale,
        'This canvas is still blank. Add a thought and I’ll start finding the threads between what you write.',
        '这块画布还是空的。写下一个念头，我就开始寻找它们之间的线。',
      ),
      sources: [],
      followUps: [
        pick(locale, 'How do I add a thought?', '怎样添加一个念头？'),
        pick(locale, 'What makes a good first note?', '什么样的第一条笔记算好？'),
      ],
    };
  }

  const scored = notes
    .map((note) => {
      const text = `${note.text} ${note.author ?? ''}`.toLowerCase();
      let score = 0;
      queryTokens.forEach((token) => {
        if (text.includes(token)) score += 2.2;
        if (text.includes(token.slice(0, 5))) score += 0.8;
      });
      const concepts = conceptsFor(query);
      concepts.forEach((concept) => {
        if (conceptsFor(note.text).includes(concept)) score += 1.4;
      });
      if (note.kind === 'question') score += 0.15;
      return { note, score };
    })
    .sort((a, b) => b.score - a.score);

  const strong = scored.filter((item) => item.score > 0.6).slice(0, 3);
  const chosen = strong.length ? strong : scored.slice(0, 2);
  const lead = chosen[0]?.note;
  const second = chosen[1]?.note;

  const lines: string[] = [];
  if (lead) lines.push(firstSentence(lead.text));
  if (second) {
    lines.push(
      pick(
        locale,
        `That sits next to a second signal: ${firstSentence(second.text).toLowerCase()}`,
        `它旁边还有第二个信号：${firstSentence(second.text)}`,
      ),
    );
  }

  if (locale === 'zh') {
    lines.push(
      `放在一起看，${analysis.throughline}${analysis.threads[0]?.summary ? ` ${analysis.threads[0].summary}` : ''}`,
    );
  } else {
    const keywords = topKeywords(chosen.map((item) => item.note.text).join(' '), 2);
    lines.push(
      `Read together, the canvas is less interested in ${keywords[1] ?? 'the surface'} than in ${keywords[0] ?? 'the underlying pattern'}. ${analysis.threads[0]?.summary ?? ''}`,
    );
  }

  return {
    text: lines.join('\n\n'),
    sources: chosen.map((item) => item.note.id),
    followUps: [
      translate(locale, 'prompt.throughline'),
      translate(locale, 'prompt.tension'),
      translate(locale, 'prompt.next'),
    ],
  };
}

export function askCanvas(
  query: string,
  board: Board,
  analysis: Analysis,
  locale: Locale = 'en',
): AskResult {
  const q = query.toLowerCase();
  const sourcesForThreads = analysis.threads
    .flatMap((thread) => pickThreadSources(thread, board.notes))
    .slice(0, 5);

  if (
    /(how (does|do) weft|how weft works|how to use weft|add (a )?(thought|note)|first note|first prompt|good note)/.test(q) ||
    /((weft|这里|这块画布|你).*(怎么|如何).*(工作|用)|怎么用\s*weft|如何使用\s*weft|添加.*(念头|笔记)|第一条笔记|开头提示|好笔记)/.test(q)
  ) {
    return {
      text: pick(
        locale,
        'Weft keeps your canvas in this browser. Notes are compared and gathered into threads on-device. A reading snapshot is sent to DeepSeek to refine the throughline, tension and open question; when you ask, canvas context goes with your question for a grounded answer. The local reading stays as a fallback.\n\nGood first notes are small and specific — one claim, one question, or one line you want to keep. Don’t try to write the whole argument. Weft needs edges before it can find a shape.',
        'Weft 把你的画布留在这个浏览器里。笔记在这台设备上被比较、聚成线索。阅读快照会发送给 DeepSeek，用来打磨主线、张力与开放问题；当你提问时，画布上下文会随问题一起发送，生成有依据的回答。本地阅读始终作为回退。\n\n好的第一条笔记小而具体——一个判断、一个问题，或一句你想留下的话。不必写出完整论证。Weft 需要先看到边缘，才能找到形状。',
      ),
      sources: [],
      followUps: [],
    };
  }

  if (!board.notes.length) {
    return {
      text: pick(
        locale,
        'A blank canvas is still a useful place to begin. Add one thought — even a bad one — and I’ll begin weaving it into the rest.',
        '空白画布也是开始的好地方。先写下一条——哪怕不完美——我会把它织进其余的想法里。',
      ),
      sources: [],
      followUps: [
        pick(locale, 'Give me a first prompt', '给我一个开头提示'),
        pick(locale, 'How does Weft work?', 'Weft 是怎么工作的？'),
      ],
    };
  }

  if (
    /(summar|throughline|thesis|argument|mean|point|overview|read)/.test(q) ||
    /(总结|概括|主线|论点|主旨|大意|讲了什么|读起来|意思|观点)/.test(q)
  ) {
    const threadLines = analysis.threads
      .slice(0, 3)
      .map((thread, index) => {
        const source = board.notes.find((note) => note.id === thread.noteIds[0]);
        if (locale === 'zh') {
          return `${['首先', '然后', '还有'][index] ?? '另外'}，${thread.label}——${thread.summary.replace(/[。.]$/, '')}。${source ? `“${source.text}”` : ''}`;
        }
        return `${['First', 'Then', 'And'][index] ?? 'Also'}, ${thread.label.toLowerCase()} — ${thread.summary.replace(/\.$/, '').toLowerCase()}.${source ? ` “${source.text}”` : ''}`;
      })
      .join('\n\n');
    return {
      text: pick(
        locale,
        `${analysis.throughline}\n\n${threadLines}\n\nThe useful tension is ${analysis.tension.toLowerCase()}`,
        `${analysis.throughline}\n\n${threadLines}\n\n真正有用的张力在于：${analysis.tension}`,
      ),
      sources: sourcesForThreads,
      followUps: [
        translate(locale, 'prompt.tension'),
        translate(locale, 'prompt.next'),
        translate(locale, 'prompt.brief'),
      ],
    };
  }

  if (
    /(tension|conflict|contradict|oppos|friction|against)/.test(q) ||
    /(张力|矛盾|冲突|对立|摩擦|相反|分歧|对抗)/.test(q)
  ) {
    const first = analysis.threads[0];
    const second = analysis.threads[1];
    const sides =
      first && second
        ? pick(
            locale,
            `\n\n${first.label} holds one side of it — ${first.summary.replace(/\.$/, '').toLowerCase()}. ${second.label} holds the other — ${second.summary.replace(/\.$/, '').toLowerCase()}.`,
            `\n\n${first.label}占着一侧——${first.summary.replace(/[。.]$/, '')}。${second.label}占着另一侧——${second.summary.replace(/[。.]$/, '')}。`,
          )
        : '';
    return {
      text: pick(
        locale,
        `${analysis.tensionTitle}: ${analysis.tension}${sides}\n\nThe contradiction is productive. The gap between those positions is where the next decision lives.`,
        `${analysis.tensionTitle}：${analysis.tension}${sides}\n\n这种矛盾是有生产力的。两种立场之间的空隙，正是下一个决定生长的地方。`,
      ),
      sources: sourcesForThreads.slice(0, 4),
      followUps: [
        translate(locale, 'prompt.next'),
        pick(locale, 'Draft a thesis from this', '从这里提炼一个论点'),
        translate(locale, 'prompt.missing'),
      ],
    };
  }

  if (
    /(next|should|action|experiment|prototype|test|move)/.test(q) ||
    /(下一步|接下来|该做|行动|实验|验证|原型|测试|推进|怎么办)/.test(q)
  ) {
    return {
      text: pick(
        locale,
        `You have enough material to make this testable.\n\nTurn the open question into one small probe: ${analysis.openQuestion}\n\nBefore you begin, write down what you expect to see and the shortest piece of evidence that would prove you wrong. Keep it to a week. The point isn’t to confirm the thesis — it’s to find the edge where it breaks.\n\nWrite it as a one-line bet: “${analysis.tensionTitle} is the real constraint here.”`,
        `你已经有足够的材料，可以把它变成一次可验证的尝试。\n\n把开放问题变成一个小实验：${analysis.openQuestion}\n\n开始之前，写下你预期看到什么，以及能证明你错了的最短证据。给它一周时间。重点不是确认假设，而是找到它开始破裂的边缘。\n\n把它写成一句话的赌注：“${analysis.tensionTitle}才是这里真正的约束。”`,
      ),
      sources: sourcesForThreads.slice(0, 3),
      followUps: [
        translate(locale, 'prompt.tension'),
        translate(locale, 'prompt.mind'),
        pick(locale, 'Draft a working brief', '起草一份工作简报'),
      ],
    };
  }

  if (
    /(connect|link|relat|between)/.test(q) ||
    /(连接|联系|关联|关系|之间)/.test(q)
  ) {
    const first = analysis.threads[0];
    const second = analysis.threads[1];
    if (first && second) {
      return {
        text: pick(
          locale,
          `${first.label} and ${second.label} are two sides of the same move.\n\n${first.summary}\n\n${second.summary}\n\nThe bridge is not a third idea. It is the question both threads are already answering: ${analysis.openQuestion}`,
          `${first.label}和${second.label}是同一个动作的两面。\n\n${first.summary}\n\n${second.summary}\n\n桥并不是第三个想法。它就是两条线索早已在共同回答的问题：${analysis.openQuestion}`,
        ),
        sources: [
          ...pickThreadSources(first, board.notes),
          ...pickThreadSources(second, board.notes),
        ].slice(0, 4),
        followUps: [
          translate(locale, 'prompt.throughline'),
          translate(locale, 'prompt.tension'),
          translate(locale, 'prompt.next'),
        ],
      };
    }
  }

  if (
    /(missing|question|gap|blind|unknown)/.test(q) ||
    /(缺少|缺什么|问题|盲点|空白|未知|遗漏|反方)/.test(q)
  ) {
    return {
      text: pick(
        locale,
        `The canvas is missing a counter-voice.\n\nThe notes currently lean toward: ${analysis.throughline} Add the strongest note you can that argues against that position — not a straw man, but the version a thoughtful critic would make. The map gets more useful when it can hold a real disagreement.\n\nOne place to start: ${analysis.openQuestion}`,
        `这块画布缺少一个反方声音。\n\n目前的笔记更倾向于：${analysis.throughline} 加上一条你能写出的最强反论——不是稻草人，而是一位有思想的批评者会提出的版本。当地图能容纳真正的分歧时，它才更有用。\n\n一个开始的地方：${analysis.openQuestion}`,
      ),
      sources: analysis.threads.flatMap((thread) => thread.noteIds.slice(0, 1)),
      followUps: [
        translate(locale, 'prompt.tension'),
        translate(locale, 'prompt.next'),
      ],
    };
  }

  return retrievalAnswer(query, board, analysis, locale);
}

export function estimateNoteHeight(note: Note): number {
  const cjkCount = (note.text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const cjk = cjkCount > 0;
  const capacity =
    note.kind === 'quote' || note.kind === 'question'
      ? cjk
        ? 10
        : 23
      : note.kind === 'source'
        ? cjk
          ? 11
          : 23
        : cjk
          ? 13
          : 27;
  const lines = Math.max(2, Math.ceil(note.text.length / capacity));
  const lineHeight =
    note.kind === 'quote' || note.kind === 'question'
      ? cjk
        ? 28.5
        : 24.8
      : note.kind === 'source'
        ? cjk
          ? 22.4
          : 20.2
        : cjk
          ? 24.5
          : 21.6;
  return 96 + lines * lineHeight + (note.author ? 26 : 0);
}

export function assignThread(board: Board, text: string): { threadId: string; created: boolean } {
  if (!board.notes.length && board.threads.length === 0) {
    return { threadId: `thread-${Date.now().toString(36)}`, created: true };
  }

  const threadIds = board.threads.length
    ? board.threads.map((meta) => meta.id)
    : [...new Set(board.notes.map((note) => note.threadId))];

  if (!threadIds.length) {
    return { threadId: `thread-${Date.now().toString(36)}`, created: true };
  }

  const incoming = new Set(tokenize(text));
  const incomingConcepts = new Set(conceptsFor(text));

  const scores = threadIds.map((id) => {
    const members = board.notes.filter((note) => note.threadId === id);
    if (!members.length) return { id, score: 0.05 };
    const tokens = new Set<string>();
    const concepts = new Set<string>();
    members.forEach((member) => {
      tokenize(member.text).forEach((token) => tokens.add(token));
      conceptsFor(member.text).forEach((concept) => concepts.add(concept));
    });
    let tokenScore = 0;
    incoming.forEach((token) => (tokenScore += tokens.has(token) ? 1 : 0));
    tokenScore /= Math.max(1, incoming.size);
    let conceptScore = 0;
    incomingConcepts.forEach((concept) => (conceptScore += concepts.has(concept) ? 1 : 0));
    conceptScore /= Math.max(1, incomingConcepts.size);
    return { id, score: conceptScore * 0.82 + tokenScore * 0.18 };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score < 0.12 && board.threads.length < 4 && board.notes.length >= 2) {
    return { threadId: `thread-${Date.now().toString(36)}`, created: true };
  }
  return { threadId: best?.id ?? threadIds[0], created: false };
}
