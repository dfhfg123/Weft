import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  Grid2X2,
  Languages,
  Layers,
  PanelRight,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Analysis, Board, Note } from '../types';
import type { Locale, MessageKey } from '../messages';
import { useI18n } from '../i18n-context';

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
  locale: Locale;
  onToggleLocale: () => void;
}

const kindKeys: Record<Note['kind'], MessageKey> = {
  thought: 'noteKind.thought',
  question: 'noteKind.question',
  quote: 'noteKind.quote',
  source: 'noteKind.source',
};

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
  locale,
  onToggleLocale,
}: CommandPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const actions = useMemo<PaletteAction[]>(() => {
    const base: PaletteAction[] = [
      {
        id: 'new-note',
        label: t('palette.newNote'),
        hint: 'N',
        icon: <Plus size={15} />,
        action: onNewNote,
      },
      {
        id: 'new-canvas',
        label: t('palette.newCanvas'),
        hint: '⌘⇧N',
        icon: <FolderOpen size={15} />,
        action: onNewCanvas,
      },
      {
        id: 'brief',
        label: t('palette.brief'),
        icon: <FileText size={15} />,
        action: onOpenBrief,
      },
      {
        id: 'tidy',
        label: t('palette.tidy'),
        icon: <Grid2X2 size={15} />,
        action: onTidy,
      },
      {
        id: 'panel',
        label: t('palette.togglePanel'),
        icon: <PanelRight size={15} />,
        action: onTogglePanel,
      },
      {
        id: 'language',
        label:
          locale === 'en' ? t('topbar.switchToChinese') : t('topbar.switchToEnglish'),
        hint: t('palette.language', { language: locale === 'en' ? 'English' : '中文' }),
        icon: <Languages size={15} />,
        action: onToggleLocale,
      },
    ];
    boards
      .filter((item) => item.id !== board.id)
      .forEach((item) => {
        base.push({
          id: `board-${item.id}`,
          label: t('palette.openCanvas', { name: item.name }),
          hint: t('palette.notesCount', {
            count: item.notes.length,
            unit: t(
              item.notes.length === 1 ? 'unit.noteOne' : 'unit.noteMany',
            ),
          }),
          icon: <Layers size={15} />,
          action: () => onSelectBoard(item.id),
        });
      });
    return base;
  }, [
    board.id,
    boards,
    locale,
    onNewNote,
    onNewCanvas,
    onOpenBrief,
    onTidy,
    onTogglePanel,
    onSelectBoard,
    onToggleLocale,
    t,
  ]);

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
        hint: t('palette.noteHint', {
          kind: t(kindKeys[note.kind]),
          thread:
            analysis.threads.find((thread) => thread.id === note.threadId)?.short ??
            t('note.unsorted'),
        }),
        icon: <Sparkles size={14} />,
        run: () => onFocusNote(note),
      }));
    return [...actionRows, ...noteRows].slice(0, 12);
  }, [actions, analysis.threads, board.notes, onFocusNote, query, t]);

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
      <div className="command-palette" role="dialog" aria-modal="true" aria-label={t('palette.aria')}>
        <div className="palette-search">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.searchAria')}
          />
          <kbd>esc</kbd>
        </div>
        <div className="palette-results">
          {rows.length === 0 && (
            <div className="palette-empty">
              <Sparkles size={16} />
              <p>{t('palette.empty', { query })}</p>
              <span>{t('palette.emptyHint')}</span>
            </div>
          )}
          {rows.map((row, index) => (
            <div key={row.key}>
              {index === firstNoteIndex && (
                <div className="palette-section-label">{t('palette.notes')}</div>
              )}
              {index === 0 && firstNoteIndex !== 0 && (
                <div className="palette-section-label">{t('palette.actions')}</div>
              )}
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
            {t('palette.navigate')}
          </span>
          <span>
            <kbd>↵</kbd>
            {t('palette.open')}
          </span>
          <span className="palette-brand">
            <Sparkles size={11} />
            {t('palette.command')}
          </span>
        </div>
      </div>
    </div>
  );
}
