import { useEffect, useRef, useState } from 'react';
import type { Analysis, Board } from './types';
import type { Locale } from './messages';
import { fetchCanvasInsight, type Insight } from './ai-client';

const CACHE_PREFIX = 'weft.insight.v1';

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function boardDigest(board: Board, locale: Locale): string {
  const notes = board.notes
    .map(
      (note) =>
        `${note.id}:${note.threadId}:${note.kind}:${note.author ?? ''}:${note.text}`,
    )
    .join('\u001f');
  const threads = board.threads
    .map((thread) => `${thread.id}:${thread.label}:${thread.short}:${thread.summary}`)
    .join('\u001f');
  return hashString(
    `${locale}\u001e${board.id}\u001e${board.name}\u001e${threads}\u001e${notes}`,
  );
}

function readCache(key: string): Insight | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Insight;
    if (!parsed || !Array.isArray(parsed.threads)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, insight: Insight) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}:${key}`, JSON.stringify(insight));
  } catch {
    // Session storage can be unavailable or full; the model reading is optional.
  }
}

/**
 * Refines the local canvas reading with the model.
 * The local analysis is always available immediately; this only layers on top.
 */
export function useBoardInsight(board: Board, analysis: Analysis, locale: Locale): Insight | null {
  const digest = boardDigest(board, locale);
  const key = `${board.id}:${locale}:${digest}`;
  const [state, setState] = useState<{ key: string; insight: Insight } | null>(() => {
    const cached = readCache(key);
    return cached ? { key, insight: cached } : null;
  });

  const cached = state?.key === key ? state.insight : readCache(key);
  const request = useRef({ board, analysis, locale });

  useEffect(() => {
    request.current = { board, analysis, locale };
  }, [board, analysis, locale]);

  useEffect(() => {
    const { board, analysis, locale } = request.current;
    if (!board.notes.length) return;
    if (readCache(key)) return;

    const controller = new AbortController();
    const delay = window.setTimeout(() => {
      fetchCanvasInsight(board, analysis, locale, controller.signal)
        .then((insight) => {
          if (!insight || controller.signal.aborted) return;
          writeCache(key, insight);
          setState({ key, insight });
        })
        .catch(() => {
          // A local reading is already on screen; failure is intentionally quiet.
        });
    }, 1100);

    return () => {
      window.clearTimeout(delay);
      controller.abort();
    };
    // `key` captures the canvas content, locale and board id; position-only
    // changes do not need a new model reading.
  }, [key]);

  return cached;
}
