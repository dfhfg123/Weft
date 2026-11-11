import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Search,
} from 'lucide-react';
import type { Board } from '../types';
import { WeftMark, Wordmark } from './Brand';

interface TopBarProps {
  board: Board;
  panelOpen: boolean;
  onOpenPalette: () => void;
  onOpenBrief: () => void;
  onTogglePanel: () => void;
  onShare: () => void;
  onRename: (name: string) => void;
  onAccount: () => void;
}

export function TopBar({
  board,
  panelOpen,
  onOpenPalette,
  onOpenBrief,
  onTogglePanel,
  onShare,
  onRename,
  onAccount,
}: TopBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(board.name);
    setEditing(true);
  };

  const commitName = () => {
    const next = draft.trim();
    if (next) onRename(next);
    else setDraft(board.name);
    setEditing(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <WeftMark size={30} />
        <Wordmark />
      </div>
      <div className="topbar-divider" />
      <div className="topbar-crumbs">
        <span className="crumb-muted">Canvases</span>
        <ChevronRight size={13} className="crumb-chevron" />
        {editing ? (
          <input
            ref={inputRef}
            className="crumb-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitName();
              if (event.key === 'Escape') {
                setDraft(board.name);
                setEditing(false);
              }
            }}
            aria-label="Canvas name"
          />
        ) : (
          <button className="crumb-board" onClick={startEditing} title="Rename canvas">
            <i style={{ background: board.color }} />
            {board.name}
          </button>
        )}
      </div>
      <div className="topbar-actions">
        <span className="save-state">
          <Check size={12} strokeWidth={2.6} />
          Saved locally
        </span>
        <button className="icon-button topbar-search" onClick={onOpenPalette} aria-label="Search canvas">
          <Search size={16} />
          <span className="search-hint">Search</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="ghost-button share-button" onClick={onShare} title="Share working brief" aria-label="Share working brief">
          Share
          <ArrowUpRight size={14} />
        </button>
        <button className="brief-button" onClick={onOpenBrief}>
          <FileText size={14} />
          Draft brief
        </button>
        <button
          className="icon-button panel-toggle"
          onClick={onTogglePanel}
          aria-label={panelOpen ? 'Hide Weft AI' : 'Show Weft AI'}
        >
          {panelOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
        <button className="avatar" aria-label="Account" onClick={onAccount}>
          <span>MC</span>
          <i />
        </button>
      </div>
    </header>
  );
}
