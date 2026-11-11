import {
  ArrowUp,
  Focus,
  Grid2X2,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Analysis, Board, Note } from '../types';
import { estimateNoteHeight } from '../ai';
import { NoteCard } from './NoteCard';
import { useI18n } from '../i18n-context';

interface CanvasBoardProps {
  board: Board;
  analysis: Analysis;
  selectedNoteId: string | null;
  selectedThreadId: string | null;
  focusRequest: { noteId: string; nonce: number } | null;
  justAddedId: string | null;
  fitNonce: number;
  onUpdateNote: (id: string, patch: Partial<Note>) => void;
  onSelectNote: (id: string | null) => void;
  onEditNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onFocusThread: (id: string | null) => void;
  onArrange: () => void;
  onQuickAdd: (text: string) => void;
  onOpenComposer: () => void;
  panelOpen: boolean;
}

interface View {
  x: number;
  y: number;
  z: number;
}

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.65;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CanvasBoard({
  board,
  analysis,
  selectedNoteId,
  selectedThreadId,
  focusRequest,
  justAddedId,
  fitNonce,
  onUpdateNote,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  onFocusThread,
  onArrange,
  onQuickAdd,
  onOpenComposer,
  panelOpen,
}: CanvasBoardProps) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.88 });
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [panning, setPanning] = useState(false);
  const [quickText, setQuickText] = useState('');
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; viewX: number; viewY: number } | null>(
    null,
  );
  const quickInputRef = useRef<HTMLInputElement>(null);
  const didInitialFit = useRef(false);

  const measure = useCallback((id: string, size: { width: number; height: number }) => {
    setSizes((current) => {
      const previous = current[id];
      if (previous && Math.abs(previous.width - size.width) < 0.5 && Math.abs(previous.height - size.height) < 0.5) {
        return current;
      }
      return { ...current, [id]: size };
    });
  }, []);

  const getRect = useCallback(
    (note: Note) => {
      const size = sizes[note.id];
      return {
        x: note.x,
        y: note.y,
        w: size?.width ?? note.width,
        h: size?.height ?? estimateNoteHeight(note),
      };
    },
    [sizes],
  );

  const contentBounds = useMemo(() => {
    if (!board.notes.length) return { x: 0, y: 0, w: 900, h: 620 };
    const rects = board.notes.map(getRect);
    const minX = Math.min(...rects.map((rect) => rect.x));
    const minY = Math.min(...rects.map((rect) => rect.y));
    const maxX = Math.max(...rects.map((rect) => rect.x + rect.w));
    const maxY = Math.max(...rects.map((rect) => rect.y + rect.h));
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [board.notes, getRect]);

  const threadBounds = useMemo(
    () =>
      analysis.threads.map((thread) => {
        const rects = thread.noteIds
          .map((id) => board.notes.find((note) => note.id === id))
          .filter((note): note is Note => Boolean(note))
          .map(getRect);
        if (!rects.length) return null;
        const minX = Math.min(...rects.map((rect) => rect.x));
        const minY = Math.min(...rects.map((rect) => rect.y));
        const maxX = Math.max(...rects.map((rect) => rect.x + rect.w));
        const maxY = Math.max(...rects.map((rect) => rect.y + rect.h));
        return {
          id: thread.id,
          x: minX - 22,
          y: minY - 54,
          w: maxX - minX + 44,
          h: maxY - minY + 76,
        };
      }),
    [analysis.threads, board.notes, getRect],
  );

  const initialBounds = useMemo(
    () => (window.innerWidth <= 640 && threadBounds[0] ? threadBounds[0] : contentBounds),
    [contentBounds, threadBounds],
  );

  const fitToBounds = useCallback(
    (bounds: { x: number; y: number; w: number; h: number }, maxZoom = 0.98) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const paddingX = Math.min(72, rect.width * 0.075);
      const paddingY = Math.min(72, rect.height * 0.075);
      const paddedW = bounds.w + paddingX * 2;
      const paddedH = bounds.h + paddingY * 2;
      const zoom = clamp(Math.min(rect.width / paddedW, rect.height / paddedH), MIN_ZOOM, maxZoom);
      setView({
        z: zoom,
        x: rect.width / 2 - (bounds.x + bounds.w / 2) * zoom,
        y: rect.height / 2 - (bounds.y + bounds.h / 2) * zoom,
      });
    },
    [],
  );

  const fitView = useCallback(() => {
    fitToBounds(contentBounds);
  }, [contentBounds, fitToBounds]);

  useEffect(() => {
    if (didInitialFit.current) return;
    const timer = window.setTimeout(() => {
      fitToBounds(initialBounds, window.innerWidth <= 640 ? 1 : 0.98);
      didInitialFit.current = true;
    }, 75);
    return () => window.clearTimeout(timer);
  }, [initialBounds, fitToBounds]);

  useEffect(() => {
    if (!fitNonce) return;
    const timer = window.setTimeout(() => fitToBounds(contentBounds), 60);
    return () => window.clearTimeout(timer);
  }, [fitNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedThreadId) return;
    const index = analysis.threads.findIndex((thread) => thread.id === selectedThreadId);
    const bounds = threadBounds[index];
    if (bounds) fitToBounds(bounds, 1.02);
  }, [selectedThreadId, analysis.threads, threadBounds, fitToBounds]);

  useEffect(() => {
    if (!focusRequest) return;
    const note = board.notes.find((item) => item.id === focusRequest.noteId);
    if (!note) return;
    const rect = getRect(note);
    const viewport = viewportRef.current;
    if (!viewport) return;
    const viewportRect = viewport.getBoundingClientRect();
    const zoom = clamp(Math.max(view.z, 0.96), MIN_ZOOM, 1.2);
    setView({
      z: zoom,
      x: viewportRect.width / 2 - (rect.x + rect.w / 2) * zoom,
      y: viewportRect.height / 2 - (rect.y + rect.h / 2) * zoom,
    });
  }, [focusRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.0022);
        setView((current) => {
          const nextZoom = clamp(current.z * factor, MIN_ZOOM, MAX_ZOOM);
          const rect = viewport.getBoundingClientRect();
          const cursorX = event.clientX - rect.left;
          const cursorY = event.clientY - rect.top;
          const wx = (cursorX - current.x) / current.z;
          const wy = (cursorY - current.y) / current.z;
          return {
            z: nextZoom,
            x: cursorX - wx * nextZoom,
            y: cursorY - wy * nextZoom,
          };
        });
      } else {
        setView((current) => ({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        }));
      }
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    setView((current) => {
      const nextZoom = clamp(current.z * factor, MIN_ZOOM, MAX_ZOOM);
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const wx = (centerX - current.x) / current.z;
      const wy = (centerY - current.y) / current.z;
      return {
        z: nextZoom,
        x: centerX - wx * nextZoom,
        y: centerY - wy * nextZoom,
      };
    });
  }, []);

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-card], .canvas-ui, button, input, textarea, a')) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewX: view.x,
      viewY: view.y,
    };
    setPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectNote(null);
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setView((current) => ({
      ...current,
      x: pan.viewX + event.clientX - pan.startX,
      y: pan.viewY + event.clientY - pan.startY,
    }));
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current || panRef.current.pointerId !== event.pointerId) return;
    panRef.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const submitQuick = (event: React.FormEvent) => {
    event.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    onQuickAdd(text);
    setQuickText('');
  };

  const focusThread = analysis.threads.find((thread) => thread.id === selectedThreadId);
  const selectedNote = board.notes.find((note) => note.id === selectedNoteId);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]')) return;
      if (document.querySelector('.modal-backdrop')) return;
      if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        quickInputRef.current?.focus();
      }
      if (event.key === '0' && !event.metaKey && !event.ctrlKey) {
        fitView();
      }
      if (event.key === 'Escape') {
        if (selectedThreadId) onFocusThread(null);
        else if (selectedNoteId) onSelectNote(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fitView, onFocusThread, onSelectNote, selectedNoteId, selectedThreadId]);

  const noteNumber = (id: string) => {
    const index = board.notes.findIndex((note) => note.id === id);
    return String(index + 1).padStart(2, '0');
  };

  return (
    <main className={`canvas-area ${panelOpen ? 'panel-open' : ''}`}>
      <div
        ref={viewportRef}
        className={`canvas-viewport ${panning ? 'panning' : ''}`}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerCancel={handlePanEnd}
      >
        <div
          className="canvas-world"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.z})`,
          }}
        >
          <svg className="connection-layer" width="1" height="1" aria-hidden="true">
            {analysis.connections.map((connection, index) => {
              const a = board.notes.find((note) => note.id === connection.a);
              const b = board.notes.find((note) => note.id === connection.b);
              if (!a || !b) return null;
              const ar = getRect(a);
              const br = getRect(b);
              const ax = ar.x + ar.w / 2;
              const ay = ar.y + ar.h / 2;
              const bx = br.x + br.w / 2;
              const by = br.y + br.h / 2;
              const mid = (ax + bx) / 2;
              const isRelated =
                selectedNote &&
                (selectedNote.id === connection.a || selectedNote.id === connection.b);
              const withinFocus =
                !selectedThreadId ||
                (analysis.threads
                  .find((thread) => thread.id === selectedThreadId)
                  ?.noteIds.includes(connection.a) &&
                  analysis.threads
                    .find((thread) => thread.id === selectedThreadId)
                    ?.noteIds.includes(connection.b));
              const thread = analysis.threads.find((item) => item.noteIds.includes(connection.a));
              return (
                <path
                  key={`${connection.a}-${connection.b}-${index}`}
                  d={`M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`}
                  className={`connection ${isRelated ? 'related' : ''} ${selectedNote && !isRelated ? 'muted' : ''} ${!withinFocus ? 'muted' : ''}`}
                  style={
                    {
                      '--connection-color': thread?.color ?? '#181B16',
                      opacity: selectedNote
                        ? isRelated
                          ? 0.75
                          : 0.035
                        : clamp(connection.strength * 1.9, 0.07, 0.24),
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </svg>

          {analysis.threads.map((thread, index) => {
            const bounds = threadBounds[index];
            if (!bounds) return null;
            const isFocused = selectedThreadId === thread.id;
            return (
              <div
                key={`zone-${thread.id}`}
                className={`thread-zone ${isFocused ? 'focused' : ''} ${selectedThreadId && !isFocused ? 'muted' : ''}`}
                style={
                  {
                    left: bounds.x,
                    top: bounds.y,
                    width: bounds.w,
                    height: bounds.h,
                    '--thread-color': thread.color,
                  } as React.CSSProperties
                }
              >
                <button
                  className="thread-zone-label canvas-ui"
                  onClick={() => onFocusThread(isFocused ? null : thread.id)}
                >
                  <span className="thread-zone-dot" />
                  <span>{thread.label}</span>
                  <span className="thread-zone-count">{thread.noteIds.length}</span>
                </button>
              </div>
            );
          })}

          {board.notes.map((note, index) => {
            const thread = analysis.threads.find((item) => item.id === note.threadId);
            const dimmed =
              (selectedThreadId !== null && note.threadId !== selectedThreadId) ||
              (selectedNoteId !== null && note.id !== selectedNoteId);
            return (
              <NoteCard
                key={note.id}
                note={note}
                thread={thread}
                selected={selectedNoteId === note.id}
                dimmed={Boolean(dimmed)}
                justAdded={justAddedId === note.id}
                index={index}
                zoom={view.z}
                onSelect={onSelectNote}
                onUpdate={onUpdateNote}
                onEdit={onEditNote}
                onDelete={onDeleteNote}
                onMeasure={measure}
              />
            );
          })}
        </div>

        <div className="canvas-stats canvas-ui">
          <span className="stats-spark">
            <Sparkles size={13} />
          </span>
          <span>
            <strong>{analysis.noteCount}</strong>{' '}
            {t(analysis.noteCount === 1 ? 'unit.noteOne' : 'unit.noteMany')}
          </span>
          <i />
          <span>
            <strong>{analysis.threads.length}</strong>{' '}
            {t(
              analysis.threads.length === 1 ? 'unit.threadOne' : 'unit.threadMany',
            )}
          </span>
          <span className="stats-live">
            <i />
            {t('canvas.live')}
          </span>
        </div>

        {focusThread && (
          <div className="focus-pill canvas-ui" style={{ '--thread-color': focusThread.color } as React.CSSProperties}>
            <span className="focus-pill-dot" />
            {t('canvas.tracingLead')} <strong>{focusThread.label}</strong>
            <button onClick={() => onFocusThread(null)} aria-label={t('canvas.clearThread')}>
              <X size={13} />
            </button>
          </div>
        )}

        {selectedNote && !focusThread && (
          <div className="focus-pill canvas-ui neutral">
            {t('canvas.note', { number: noteNumber(selectedNote.id) })}
            <span className="focus-pill-text">{selectedNote.text.slice(0, 48)}{selectedNote.text.length > 48 ? '…' : ''}</span>
            <button onClick={() => onSelectNote(null)} aria-label={t('canvas.clearNote')}>
              <X size={13} />
            </button>
          </div>
        )}

        <div className="canvas-controls canvas-ui">
          <button onClick={() => zoomBy(0.86)} aria-label={t('canvas.zoomOut')}>
            <Minus size={15} />
          </button>
          <button className="zoom-readout" onClick={fitView} aria-label={t('canvas.fit')}>
            {Math.round(view.z * 100)}%
          </button>
          <button onClick={() => zoomBy(1.16)} aria-label={t('canvas.zoomIn')}>
            <Plus size={15} />
          </button>
          <span className="control-divider" />
          <button onClick={fitView} aria-label={t('canvas.fit')} data-tooltip={t('canvas.fitTooltip')}>
            <Maximize2 size={14} />
          </button>
          <button onClick={onArrange} aria-label={t('canvas.tidy')} data-tooltip={t('canvas.tidyTooltip')}>
            <Grid2X2 size={14} />
          </button>
        </div>

        <div className="canvas-hint canvas-ui">
          <MousePointer2 size={12} />
          {t('canvas.hint')}
        </div>

        <form className="quick-capture canvas-ui" onSubmit={submitQuick}>
          <button
            type="button"
            className="quick-plus"
            onClick={onOpenComposer}
            aria-label={t('canvas.openComposer')}
          >
            <Plus size={17} />
          </button>
          <input
            ref={quickInputRef}
            value={quickText}
            onChange={(event) => setQuickText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.currentTarget.blur();
            }}
            placeholder={
              board.notes.length
                ? t('canvas.quickPlaceholder')
                : t('canvas.quickPlaceholderEmpty')
            }
            aria-label={t('canvas.quickCapture')}
          />
          <span className="quick-shortcut">N</span>
          <button className="quick-submit" type="submit" disabled={!quickText.trim()} aria-label={t('canvas.addNote')}>
            <ArrowUp size={16} />
          </button>
        </form>

        <button className="canvas-focus-button canvas-ui" onClick={fitView} aria-label={t('canvas.center')}>
          <Focus size={15} />
        </button>

        {board.notes.length === 0 && (
          <div className="canvas-empty canvas-ui">
            <span className="empty-mark">
              <Sparkles size={16} />
            </span>
            <p className="eyebrow">{t('canvas.emptyEyebrow')}</p>
            <h2>
              {t('canvas.emptyTitleA')}
              <br />
              {t('canvas.emptyTitleB')}
            </h2>
            <p className="empty-copy">{t('canvas.emptyCopy')}</p>
            <button className="empty-action" onClick={onOpenComposer}>
              {t('canvas.emptyAction')}
              <ArrowUp size={14} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
