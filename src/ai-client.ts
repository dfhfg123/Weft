import type { Analysis, Board } from './types';
import type { Locale } from './messages';

export interface InsightThread {
  id: string;
  label: string;
  short?: string;
  summary: string;
}

export interface Insight {
  threads: InsightThread[];
  throughline: string;
  tensionTitle: string;
  tension: string;
  openQuestion: string;
}

export interface AskHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface StreamAnswerArgs {
  question: string;
  board: Board;
  analysis: Analysis;
  locale: Locale;
  history: AskHistoryMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

export class ModelError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = 'ModelError';
    this.code = code;
  }
}

const cleanOneLine = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

function trimBoard(board: Board) {
  return {
    name: board.name,
    notes: board.notes.map((note) => ({
      id: note.id,
      text: note.text,
      kind: note.kind,
      author: note.author,
      threadId: note.threadId,
    })),
  };
}

function trimAnalysis(analysis: Analysis) {
  return {
    throughline: analysis.throughline,
    tensionTitle: analysis.tensionTitle,
    tension: analysis.tension,
    openQuestion: analysis.openQuestion,
    threads: analysis.threads.map((thread) => ({
      id: thread.id,
      label: thread.label,
      short: thread.short,
      summary: thread.summary,
      noteIds: thread.noteIds,
    })),
  };
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === 'string' ? data.error : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * POSTs the canvas + question and consumes Weft's SSE stream.
 * Returns the complete raw answer (including citation markers).
 */
export async function streamModelAnswer({
  question,
  board,
  analysis,
  locale,
  history,
  signal,
  onDelta,
}: StreamAnswerArgs): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        locale,
        board: trimBoard(board),
        analysis: trimAnalysis(analysis),
        history,
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ModelError('unavailable');
  }

  if (!response.ok) {
    throw new ModelError(await readErrorCode(response));
  }

  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('text/event-stream') || !response.body) {
    throw new ModelError('unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let finished = false;
  let pending = '';
  let flushTimer: number | null = null;

  const flush = () => {
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!pending || signal.aborted) {
      pending = '';
      return;
    }
    const text = pending;
    pending = '';
    onDelta(text);
  };

  const queue = (text: string) => {
    pending += text;
    if (flushTimer === null) flushTimer = window.setTimeout(flush, 36);
  };

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) continue;

        let payload: {
          type?: string;
          text?: string;
          code?: string;
        };
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }

        if (payload.type === 'delta' && typeof payload.text === 'string') {
          answer += payload.text;
          queue(payload.text);
        } else if (payload.type === 'error') {
          throw new ModelError(payload.code ?? 'unavailable');
        } else if (payload.type === 'done') {
          finished = true;
          flush();
          break;
        }
      }
    }
  } finally {
    flush();
    if (!finished) await reader.cancel().catch(() => undefined);
  }

  return answer;
}

/** Fetches the model's refined reading of the current canvas. */
export async function fetchCanvasInsight(
  board: Board,
  analysis: Analysis,
  locale: Locale,
  signal: AbortSignal,
): Promise<Insight | null> {
  let response: Response;
  try {
    response = await fetch('/api/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale,
        board: trimBoard(board),
        analysis: trimAnalysis(analysis),
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return null;
  }

  if (!response.ok) return null;

  let data: { insight?: unknown };
  try {
    data = (await response.json()) as { insight?: unknown };
  } catch {
    return null;
  }
  return sanitizeInsight(data.insight, analysis);
}

function sanitizeInsight(value: unknown, analysis: Analysis): Insight | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const validIds = new Set(analysis.threads.map((thread) => thread.id));
  const seen = new Set<string>();
  const rawThreads = Array.isArray(source.threads) ? source.threads : [];
  const threads: InsightThread[] = [];

  for (const item of rawThreads) {
    if (!item || typeof item !== 'object') continue;
    const thread = item as Record<string, unknown>;
    const id = cleanOneLine(thread.id, 120);
    if (!id || !validIds.has(id) || seen.has(id)) continue;
    const label = cleanOneLine(thread.label, 60);
    const summary = cleanOneLine(thread.summary, 220);
    if (!label || !summary) continue;
    seen.add(id);
    threads.push({
      id,
      label,
      short: cleanOneLine(thread.short, 18) || undefined,
      summary,
    });
  }

  const throughline = cleanOneLine(source.throughline, 280);
  const tensionTitle = cleanOneLine(source.tensionTitle, 80);
  const tension = cleanOneLine(source.tension, 340);
  const openQuestion = cleanOneLine(source.openQuestion, 260);
  if (!threads.length && !throughline && !tension && !openQuestion) return null;

  return { threads, throughline, tensionTitle, tension, openQuestion };
}

/** Overlays the model's reading on the instant local reading. */
export function mergeInsight(analysis: Analysis, insight: Insight | null): Analysis {
  if (!insight) return analysis;
  const byId = new Map(insight.threads.map((thread) => [thread.id, thread]));

  return {
    ...analysis,
    threads: analysis.threads.map((thread) => {
      const refined = byId.get(thread.id);
      if (!refined) return thread;
      return {
        ...thread,
        label: refined.label || thread.label,
        short: refined.short || thread.short,
        summary: refined.summary || thread.summary,
      };
    }),
    throughline: insight.throughline || analysis.throughline,
    tensionTitle: insight.tensionTitle || analysis.tensionTitle,
    tension: insight.tension || analysis.tension,
    openQuestion: insight.openQuestion || analysis.openQuestion,
  };
}

/** Pulls [n], [2, 4] and [3–5] citation markers back to note ids. */
export function extractCitations(raw: string, noteIds: string[]): string[] {
  const found: number[] = [];
  const pattern = /\[([0-9][0-9\s,，、\-–—]*)\]/g;
  for (const match of raw.matchAll(pattern)) {
    for (const segment of match[1].split(/[,，、]/)) {
      const range = segment
        .trim()
        .split(/[-–—~]/)
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((number) => Number.isFinite(number));
      if (!range.length) continue;
      if (range.length >= 2) {
        const start = Math.max(1, Math.min(range[0], range[1]));
        const end = Math.min(noteIds.length, Math.max(range[0], range[1]));
        for (let index = start; index <= end && index < start + 20; index += 1) {
          found.push(index);
        }
      } else {
        found.push(range[0]);
      }
    }
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const number of found) {
    const id = noteIds[number - 1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.slice(0, 6);
}

/** Removes citation markers and light markdown from prose for display. */
export function cleanAnswerText(raw: string): string {
  return raw
    .replace(/\[(?:note\s*)?[0-9][0-9\s,，、\-–—]*\]/gi, '')
    .replace(/\[(?:note\s*)?[0-9][0-9\s,，、\-–—]*$/i, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?，。；：！？])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart();
}
