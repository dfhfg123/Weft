import { ChevronDown, Plus, Settings2, ShieldCheck } from 'lucide-react';
import type { Analysis, Board } from '../types';
import { useI18n } from '../i18n-context';

interface SidebarProps {
  boards: Board[];
  activeBoard: Board;
  analysis: Analysis;
  selectedThreadId: string | null;
  onSelectBoard: (id: string) => void;
  onNewCanvas: () => void;
  onFocusThread: (id: string | null) => void;
  onPrivacy: () => void;
  onSettings: () => void;
}

export function Sidebar({
  boards,
  activeBoard,
  analysis,
  selectedThreadId,
  onSelectBoard,
  onNewCanvas,
  onFocusThread,
  onPrivacy,
  onSettings,
}: SidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="sidebar">
      <button className="new-canvas" onClick={onNewCanvas}>
        <span className="new-canvas-icon">
          <Plus size={14} strokeWidth={2.2} />
        </span>
        {t('sidebar.newCanvas')}
        <kbd>⌘⇧N</kbd>
      </button>

      <div className="side-section">
        <div className="side-label">
          <span>{t('sidebar.canvases')}</span>
          <span className="side-count">{boards.length}</span>
        </div>
        <nav className="board-list">
          {boards.map((board) => {
            const active = board.id === activeBoard.id;
            return (
              <button
                key={board.id}
                className={`board-item ${active ? 'active' : ''}`}
                onClick={() => onSelectBoard(board.id)}
              >
                <i className="board-dot" style={{ background: board.color }} />
                <span className="board-name">{board.name}</span>
                <span className="board-count">{board.notes.length}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="side-section thread-section">
        <div className="side-label">
          <span>{t('sidebar.threads')}</span>
          <span className="side-count">{analysis.threads.length}</span>
        </div>
        <div className="thread-nav">
          {analysis.threads.map((thread) => (
            <button
              key={thread.id}
              className={`thread-nav-item ${selectedThreadId === thread.id ? 'active' : ''}`}
              onClick={() => onFocusThread(selectedThreadId === thread.id ? null : thread.id)}
            >
              <span className="thread-line" style={{ background: thread.color }}>
                <i />
              </span>
              <span className="thread-nav-label">{thread.label}</span>
              <span className="thread-nav-count">{thread.noteIds.length}</span>
            </button>
          ))}
          {analysis.threads.length === 0 && (
            <p className="thread-nav-empty">{t('sidebar.threadsEmpty')}</p>
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <button className="privacy-card" onClick={onPrivacy}>
          <span className="privacy-icon">
            <ShieldCheck size={15} />
          </span>
          <span>
            <strong>{t('sidebar.privateTitle')}</strong>
            <small>{t('sidebar.privateBody')}</small>
          </span>
          <ChevronDown size={13} className="privacy-chevron" />
        </button>
        <div className="profile-row">
          <div className="profile-avatar">MC</div>
          <div className="profile-copy">
            <strong>Maya Chen</strong>
            <small>{t('sidebar.personal')}</small>
          </div>
          <button className="profile-settings" aria-label={t('sidebar.settings')} onClick={onSettings}>
            <Settings2 size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
