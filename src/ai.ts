import type { Analysis, AskResult, Board, Connection, Note, ThreadMeta, ThreadView } from './types';
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
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map((word) => word.replace(/(ing|ed|ly|s)$/, ''))
    .filter(Boolean);
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
  return [...concepts];
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

function deriveThreadLabelFromTexts(texts: string[], index: number): string {
  const counts = new Map<string, number>();
  texts.forEach((text) => {
    for (const concept of conceptsFor(text)) {
      counts.set(concept, (counts.get(concept) ?? 0) + 1);
    }
  });
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
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
  return labels[ranked[0][0]] ?? `${normalizeLabel(ranked[0][0])} & ${normalizeLabel(ranked[1]?.[0] ?? 'clarity')}`;
}

function deriveThreadLabel(notes: Note[], index: number): string {
  return deriveThreadLabelFromTexts(notes.map((note) => note.text), index);
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match?.[0] ?? text).trim();
}

export function createThreadMeta(board: Board, text: string, threadId: string): ThreadMeta {
  const label = deriveThreadLabelFromTexts([text], board.threads.length);
  return {
    id: threadId,
    label,
    short: label.replace(/^The\s+/i, ''),
    summary: firstSentence(text),
    color: threadPalette[board.threads.length % threadPalette.length],
  };
}

function deriveSummary(notes: Note[]): string {
  if (!notes.length) return 'A thread waiting to be pulled.';
  const longest = [...notes].sort((a, b) => b.text.length - a.text.length)[0];
  return firstSentence(longest.text);
}

export function analyzeBoard(board: Board): Analysis {
  const notes = board.notes;
  const groups = new Map<string, Note[]>();
  notes.forEach((note) => {
    const list = groups.get(note.threadId) ?? [];
    list.push(note);
    groups.set(note.threadId, list);
  });

  const threads: ThreadView[] = board.threads.map((meta, index) => {
    const members = groups.get(meta.id) ?? [];
    return {
      ...meta,
      noteIds: members.map((note) => note.id),
      isDynamic: false,
      summary: meta.summary || deriveSummary(members),
      color: meta.color || threadPalette[index % threadPalette.length],
    };
  });

  [...groups.keys()].forEach((threadId, index) => {
    if (board.threads.some((meta) => meta.id === threadId)) return;
    const members = groups.get(threadId) ?? [];
    threads.push({
      id: threadId,
      label: deriveThreadLabel(members, index),
      short: deriveThreadLabel(members, index).replace(/^The\s+/i, ''),
      summary: deriveSummary(members),
      color: threadPalette[(board.threads.length + index) % threadPalette.length],
      noteIds: members.map((note) => note.id),
      isDynamic: true,
    });
  });

  for (const item of threads) {
    item.summary = item.isDynamic ? deriveSummary(groups.get(item.id) ?? []) : item.summary || deriveSummary(groups.get(item.id) ?? []);
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
    ? `${firstSentence(tensionPair[0].text)} — against ${firstSentence(tensionPair[1].text).toLowerCase()}`
    : questionNote
      ? firstSentence(questionNote.text)
      : 'Add a few more notes and the live tension will surface here.';

  return {
    threads: sortedThreads,
    connections: limited,
    noteCount: notes.length,
    throughline: board.throughline || deriveThroughline(sortedThreads),
    tensionTitle: board.tensionTitle || 'The live tension',
    tension: board.tension || dynamicTension,
    openQuestion:
      board.openQuestion ||
      questionNote?.text ||
      (sortedThreads.length > 1
        ? `What would connect ${sortedThreads[0].label.toLowerCase()} to ${sortedThreads[1].label.toLowerCase()}?`
        : 'What question is this canvas trying to answer?'),
  };
}

function deriveThroughline(threads: ThreadView[]): string {
  if (!threads.length) return 'Every canvas begins with a single thread.';
  if (threads.length === 1) return threads[0].summary;
  return `${threads[0].label} meets ${threads[1].label.toLowerCase()}.`;
}

function chooseTension(notes: Note[], matrix: number[][]): [Note, Note] | null {
  if (notes.length < 2) return null;
  const contrastWords = /\b(not|isn't|never|without|against|instead|rather|but|vs\.?|versus|less|more)\b/i;
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

function retrievalAnswer(query: string, board: Board, analysis: Analysis): AskResult {
  const notes = board.notes;
  const queryTokens = tokenize(query);
  if (!notes.length) {
    return {
      text: 'This canvas is still blank. Add a thought and I’ll start finding the threads between what you write.',
      sources: [],
      followUps: ['How do I add a thought?', 'What makes a good first note?'],
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
  const keywords = topKeywords(chosen.map((item) => item.note.text).join(' '), 2);
  const lead = chosen[0]?.note;
  const second = chosen[1]?.note;

  const lines: string[] = [];
  if (lead) {
    lines.push(`${firstSentence(lead.text)}`);
  }
  if (second) {
    lines.push(
      `That sits next to a second signal: ${firstSentence(second.text).toLowerCase()}`,
    );
  }
  lines.push(
    `Read together, the canvas is less interested in ${keywords[1] ?? 'the surface'} than in ${keywords[0] ?? 'the underlying pattern'}. ${analysis.threads[0]?.summary ?? ''}`,
  );

  return {
    text: lines.join('\n\n'),
    sources: chosen.map((item) => item.note.id),
    followUps: ['What’s the throughline?', 'Where is the tension?', 'What should I do next?'],
  };
}

export function askCanvas(query: string, board: Board, analysis: Analysis): AskResult {
  const q = query.toLowerCase();
  const sourcesForThreads = analysis.threads.flatMap((thread) => pickThreadSources(thread, board.notes)).slice(0, 5);

  if (!board.notes.length) {
    return {
      text: 'A blank canvas is still a useful place to begin. Add one thought — even a bad one — and I’ll begin weaving it into the rest.',
      sources: [],
      followUps: ['Give me a first prompt', 'How does Weft work?'],
    };
  }

  if (/(summar|throughline|thesis|argument|mean|point|overview|read)/.test(q)) {
    const threadLines = analysis.threads
      .slice(0, 3)
      .map((thread, index) => {
        const source = board.notes.find((note) => note.id === thread.noteIds[0]);
        return `${['First', 'Then', 'And'][index] ?? 'Also'}, ${thread.label.toLowerCase()} — ${thread.summary.replace(/\.$/, '').toLowerCase()}.${source ? ` “${source.text}”` : ''}`;
      })
      .join('\n\n');
    return {
      text: `${analysis.throughline}\n\n${threadLines}\n\nThe useful tension is ${analysis.tension.toLowerCase()}`,
      sources: sourcesForThreads,
      followUps: ['Where is the tension?', 'What should I do next?', 'Turn this into a brief'],
    };
  }

  if (/(tension|conflict|contradict|oppos|friction|against)/.test(q)) {
    const first = analysis.threads[0];
    const second = analysis.threads[1];
    const sides =
      first && second
        ? `\n\n${first.label} holds one side of it — ${first.summary.replace(/\.$/, '').toLowerCase()}. ${second.label} holds the other — ${second.summary.replace(/\.$/, '').toLowerCase()}.`
        : '';
    return {
      text: `${analysis.tensionTitle}: ${analysis.tension}${sides}\n\nThe contradiction is productive. The gap between those positions is where the next decision lives.`,
      sources: sourcesForThreads.slice(0, 4),
      followUps: ['What should I do next?', 'Draft a thesis from this', 'What question is missing?'],
    };
  }

  if (/(next|should|do|action|experiment|prototype|test|move)/.test(q)) {
    return {
      text: `You have enough material to make this testable.\n\nTurn the open question into one small probe: ${analysis.openQuestion}\n\nBefore you begin, write down what you expect to see and the shortest piece of evidence that would prove you wrong. Keep it to a week. The point isn’t to confirm the thesis — it’s to find the edge where it breaks.\n\nWrite it as a one-line bet: “${analysis.tensionTitle} is the real constraint here.”`,
      sources: sourcesForThreads.slice(0, 3),
      followUps: ['Where is the tension?', 'What would change my mind?', 'Draft a working brief'],
    };
  }

  if (/(connect|link|relat|between)/.test(q)) {
    const first = analysis.threads[0];
    const second = analysis.threads[1];
    if (first && second) {
      return {
        text: `${first.label} and ${second.label} are two sides of the same move.\n\n${first.summary}\n\n${second.summary}\n\nThe bridge is not a third idea. It is the question both threads are already answering: ${analysis.openQuestion}`,
        sources: [...pickThreadSources(first, board.notes), ...pickThreadSources(second, board.notes)].slice(0, 4),
        followUps: ['What’s the throughline?', 'Where is the tension?', 'What should I do next?'],
      };
    }
  }

  if (/(missing|question|gap|blind|unknown)/.test(q)) {
    return {
      text: `The canvas is missing a counter-voice.\n\nThe notes currently lean toward: ${analysis.throughline} Add the strongest note you can that argues against that position — not a straw man, but the version a thoughtful critic would make. The map gets more useful when it can hold a real disagreement.\n\nOne place to start: ${analysis.openQuestion}`,
      sources: analysis.threads.flatMap((thread) => thread.noteIds.slice(0, 1)),
      followUps: ['Where is the tension?', 'What should I do next?'],
    };
  }

  return retrievalAnswer(query, board, analysis);
}

export function estimateNoteHeight(note: Note): number {
  const textLength = note.text.length;
  const lineLength = note.kind === 'quote' || note.kind === 'question' ? 34 : 38;
  const lines = Math.max(2, Math.ceil(textLength / lineLength));
  const lineHeight = note.kind === 'quote' || note.kind === 'question' ? 23 : 21;
  return 62 + lines * lineHeight;
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
