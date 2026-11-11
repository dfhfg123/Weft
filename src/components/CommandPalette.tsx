import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  Grid2X2,
  Layers,
  PanelRight,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Analysis, Board, Note } from '../types';
import { noteKindLabel } from '../data';

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  board: Board;
  boards: Board[];
  analysis: Analysis;
  onClose: () => void;
  onNewNote: () => void;
  onNewCanvas: () => void;
  onTidy: () => void;
  onOpenBrief: () => void;
  onTogglePanel: () => void;
  onFocusNote: (note: Note) => void;
  onSelectBoard: (id: string) => void;
}

interface Row {
  key: string;
  type: 'action' | 'note';
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  board,
  boards,
  analysis,
  onClose,
  onNewNote,
  onNewCanvas,
  onTidy,
  onOpenBrief,
  onTogglePanel,
  onFocusNote,
  onSelectBoard,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const actions = useMemo<PaletteAction[]>(() => {
    const base: PaletteAction[] = [
      {
        id: 'new-note',
        label: 'New note',
        hint: 'N',
        icon: <Plus size={15} />,
        action: onNewNote,
      },
      {
        id: 'new-canvas',
        label: 'New canvas',
        hint: '⌘⇧N',
        icon: <FolderOpen size={15} />,
        action: onNewCanvas,
      },
      {
        id: 'brief',
        label: 'Draft a working brief',
        icon: <FileText size={15} />,
        action: onOpenBrief,
      },
      {
        id: 'tidy',
        label: 'Tidy canvas by meaning',
        icon: <Grid2X2 size={15} />,
        action: onTidy,
      },
      {
        id: 'panel',
        label: 'Toggle Weft AI',
        icon: <PanelRight size={15} />,
        action: onTogglePanel,
      },
    ];
    boards
      .filter((item) => item.id !== board.id)
      .forEach((item) => {
        base.push({
          id: `board-${item.id}`,
          label: `Open canvas: ${item.name}`,
          hint: `${item.notes.length} notes`,
          icon: <Layers size={15} />,
          action: () => onSelectBoard(item.id),
        });
      });
    return base;
  }, [board.id, boards, onNewNote, onNewCanvas, onOpenBrief, onTidy, onTogglePanel, onSelectBoard]);

  const rows = useMemo<Row[]>(() => {
    const normalized = query.trim().toLowerCase();
    const actionRows = actions
      .filter((action) => !normalized || action.label.toLowerCase().includes(normalized))
      .map((action) => ({
        key: action.id,
        type: 'action' as const,
        label: action.label,
        hint: action.hint,
        icon: action.icon,
        run: action.action,
      }));
    const noteRows = board.notes
      .filter((note) => !normalized || `${note.text} ${note.author ?? ''}`.toLowerCase().includes(normalized))
      .slice(0, 8)
      .map((note) => ({
        key: note.id,
        type: 'note' as const,
        label: note.text,
        hint: `${noteKindLabel[note.kind]} · ${analysis.threads.find((thread) => thread.id === note.threadId)?.short ?? 'Thread'}`,
        icon: <Sparkles size={14} />,
        run: () => onFocusNote(note),
      }));
    return [...actionRows, ...noteRows].slice(0, 12);
  }, [actions, analysis.threads, board.notes, onFocusNote, query]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((current) => (rows.length ? (current + 1) % rows.length : 0));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((current) => (rows.length ? (current - 1 + rows.length) % rows.length : 0));
      }
      if (event.key === 'Enter' && rows[active]) {
        event.preventDefault();
        rows[active].run();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, rows, active, onClose]);

  if (!open) return null;

  const firstNoteIndex = rows.findIndex((row) => row.type === 'note');

  return (
    <div className="modal-backdrop palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-search">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search notes, jump to a canvas, or run a command…"
            aria-label="Search"
          />
          <kbd>esc</kbd>
        </div>
        <div className="palette-results">
          {rows.length === 0 && (
            <div className="palette-empty">
              <Sparkles size={16} />
              <p>No notes match “{query}”</p>
              <span>Try a word, an author, or a question.</span>
            </div>
          )}
          {rows.map((row, index) => (
            <div key={row.key}>
              {index === firstNoteIndex && <div className="palette-section-label">Notes on this canvas</div>}
              {index === 0 && firstNoteIndex !== 0 && <div className="palette-section-label">Actions</div>}
              <button
                className={`palette-row ${active === index ? 'active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  row.run();
                  onClose();
                }}
              >
                <span className="palette-row-icon">{row.icon}</span>
                <span className="palette-row-label">{row.label}</span>
                {row.hint && <span className="palette-row-hint">{row.hint}</span>}
                <ArrowUpRight size={13} className="palette-arrow" />
              </button>
            </div>
          ))}
        </div>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            navigate
          </span>
          <span>
            <kbd>↵</kbd>
            open
          </span>
          <span className="palette-brand">
            <Sparkles size={11} />
            Weft command
          </span>
        </div>
      </div>
    </div>
  );
}
