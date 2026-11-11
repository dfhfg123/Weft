import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, HelpCircle, Pencil, Quote, Trash2 } from 'lucide-react';
import type { Note, ThreadView } from '../types';
import { noteKindLabel } from '../data';

interface NoteCardProps {
  note: Note;
  thread?: ThreadView;
  selected: boolean;
  dimmed: boolean;
  justAdded: boolean;
  index: number;
  zoom: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMeasure: (id: string, size: { width: number; height: number }) => void;
}

const kindIcon = {
  thought: <span className="kind-dot" />,
  question: <HelpCircle size={11} strokeWidth={2} />,
  quote: <Quote size={11} strokeWidth={2} />,
  source: <BookOpen size={11} strokeWidth={2} />,
};

export function NoteCard({
  note,
  thread,
  selected,
  dimmed,
  justAdded,
  index,
  zoom,
  onSelect,
  onUpdate,
  onEdit,
  onDelete,
  onMeasure,
}: NoteCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    noteX: number;
    noteY: number;
    moved: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const borderBox = entry.borderBoxSize?.[0];
      onMeasure(note.id, {
        width: borderBox?.inlineSize ?? element.offsetWidth,
        height: borderBox?.blockSize ?? element.offsetHeight,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [note.id, onMeasure]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest('button')) return;
      event.stopPropagation();
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        noteX: note.x,
        noteY: note.y,
        moved: false,
      };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [note.x, note.y],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = (event.clientX - drag.startX) / zoom;
      const dy = (event.clientY - drag.startY) / zoom;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        drag.moved = true;
        setDragging(true);
      }
      if (drag.moved) {
        onUpdate(note.id, {
          x: Math.round(Math.max(-80, drag.noteX + dx)),
          y: Math.round(Math.max(-80, drag.noteY + dy)),
        });
      }
    },
    [note.id, onUpdate, zoom],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag.moved) onSelect(note.id);
    },
    [note.id, onSelect],
  );

  return (
    <article
      ref={cardRef}
      className={`note-card kind-${note.kind} ${selected ? 'selected' : ''} ${
        dimmed ? 'dimmed' : ''
      } ${dragging ? 'dragging' : ''} ${justAdded ? 'just-added' : ''}`}
      style={
        {
          left: note.x,
          top: note.y,
          width: note.width,
          '--thread-color': thread?.color ?? '#B9E44B',
          '--enter-index': index,
          zIndex: dragging ? 40 : selected ? 30 : 10,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={() => onEdit(note.id)}
      data-card
    >
      <div className="note-top">
        <span className="note-kind">
          {kindIcon[note.kind]}
          {noteKindLabel[note.kind]}
        </span>
        <div className="note-actions">
          <button
            className="note-action"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(note.id);
            }}
            aria-label="Edit note"
          >
            <Pencil size={12} />
          </button>
          <button
            className="note-action danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(note.id);
            }}
            aria-label="Delete note"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="note-content">
        {note.kind === 'quote' && <span className="quote-mark">“</span>}
        <p>{note.text}</p>
        {note.author && <span className="note-author">— {note.author}</span>}
      </div>

      <div className="note-foot">
        <span className="note-thread">
          <i style={{ background: thread?.color }} />
          {thread?.short ?? 'Unsorted'}
        </span>
        <span className="note-grip">
          <i />
          <i />
          <i />
        </span>
      </div>
    </article>
  );
}
