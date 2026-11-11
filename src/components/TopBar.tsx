import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Languages,
  PanelRightClose,
  PanelRightOpen,
  Search,
} from 'lucide-react';
import type { Board } from '../types';
import type { Locale } from '../messages';
import { useI18n } from '../i18n-context';
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
  locale: Locale;
  onToggleLocale: () => void;
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
  locale,
  onToggleLocale,
}: TopBarProps) {
  const { t } = useI18n();
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
        <span className="crumb-muted">{t('topbar.canvases')}</span>
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
            aria-label={t('topbar.canvasName')}
          />
        ) : (
          <button className="crumb-board" onClick={startEditing} title={t('topbar.renameCanvas')}>
            <i style={{ background: board.color }} />
            {board.name}
          </button>
        )}
      </div>
      <div className="topbar-actions">
        <span className="save-state">
          <Check size={12} strokeWidth={2.6} />
          {t('topbar.saved')}
        </span>
        <button className="icon-button topbar-search" onClick={onOpenPalette} aria-label={t('topbar.searchCanvas')}>
          <Search size={16} />
          <span className="search-hint">{t('topbar.search')}</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="ghost-button share-button" onClick={onShare}
          title={t('topbar.shareBrief')}
          aria-label={t('topbar.shareBrief')}>
          {t('topbar.share')}
          <ArrowUpRight size={14} />
        </button>
        <button className="brief-button" onClick={onOpenBrief}>
          <FileText size={14} />
          {t('topbar.draftBrief')}
        </button>
        <button
          className="icon-button lang-button"
          onClick={onToggleLocale}
          aria-label={
            locale === 'en' ? t('topbar.switchToChinese') : t('topbar.switchToEnglish')
          }
          title={locale === 'en' ? t('topbar.switchToChinese') : t('topbar.switchToEnglish')}
        >
          <Languages size={15} />
          <span className="lang-code">{locale === 'en' ? '中' : 'EN'}</span>
        </button>
        <button
          className="icon-button panel-toggle"
          onClick={onTogglePanel}
          aria-label={panelOpen ? t('topbar.hideAi') : t('topbar.showAi')}
        >
          {panelOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
        <button className="avatar" aria-label={t('topbar.account')} onClick={onAccount}>
          <span>MC</span>
          <i />
        </button>
      </div>
    </header>
  );
}
