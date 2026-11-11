import { ArrowUpRight, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeBoard, assignThread, createThreadMeta, estimateNoteHeight } from './ai';
import { mergeInsight } from './ai-client';
import { buildBriefContent } from './brief';
import { initialWorkspaceFor, localizeWorkspace, threadPalette } from './data';
import type { Board, Note, NoteKind, Workspace } from './types';
import type { Locale, MessageKey } from './messages';
import { useI18n } from './i18n-context';
import { useBoardInsight } from './use-insight';
import { BriefModal } from './components/BriefModal';
import { CanvasBoard } from './components/CanvasBoard';
import { CommandPalette } from './components/CommandPalette';
import { ComposerModal } from './components/ComposerModal';
import { Sidebar } from './components/Sidebar';
import { SynthesisPanel } from './components/SynthesisPanel';
import { TopBar } from './components/TopBar';
import './styles.css';

const STORAGE_KEY = 'weft.workspace.v2';

const kindKeys: Record<NoteKind, MessageKey> = {
  thought: 'noteKind.thought',
  question: 'noteKind.question',
  quote: 'noteKind.quote',
  source: 'noteKind.source',
};

function cloneInitial(locale: Locale): Workspace {
  return structuredClone(initialWorkspaceFor(locale));
}

function loadWorkspace(locale: Locale): Workspace {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return cloneInitial(locale);
    const parsed = JSON.parse(stored) as Workspace;
    if (!parsed?.boards?.length || !parsed.activeBoardId) return cloneInitial(locale);
    const activeExists = parsed.boards.some((board) => board.id === parsed.activeBoardId);
    if (!activeExists) parsed.activeBoardId = parsed.boards[0].id;
    return localizeWorkspace(parsed, locale);
  } catch {
    return cloneInitial(locale);
  }
}

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  action?: () => void;
}

function findOpenPosition(
  board: Board,
  threadId: string,
  incoming: Pick<Note, 'text' | 'kind' | 'author'>,
) {
  const width = 240;
  const margin = 18;
  const threadNotes = board.notes.filter((note) => note.threadId === threadId);
  const anchor = threadNotes.length ? threadNotes : board.notes;
  const minX = anchor.length ? Math.min(...anchor.map((note) => note.x)) : 180;
  const maxX = anchor.length ? Math.max(...anchor.map((note) => note.x + note.width)) : 180;
  const minY = anchor.length ? Math.min(...anchor.map((note) => note.y)) : 120;
  const heightFor = (note: Pick<Note, 'text' | 'kind' | 'author'>) =>
    Math.max(
      estimateNoteHeight(note as Note),
      note.kind === 'quote' || note.kind === 'question' ? 190 : 160,
    );
  const maxY = anchor.length
    ? Math.max(...anchor.map((note) => note.y + heightFor(note)))
    : 120;
  const testHeight = heightFor(incoming);
  const gap = 28;
  const stepX = width + gap;
  const stepY = testHeight + gap;
  const rects = board.notes.map((note) => ({
    x: note.x,
    y: note.y,
    w: note.width,
    h: heightFor(note),
  }));
  const overlaps = (x: number, y: number) =>
    rects.some(
      (rect) =>
        x < rect.x + rect.w + margin &&
        x + width + margin > rect.x &&
        y < rect.y + rect.h + margin &&
        y + testHeight + margin > rect.y,
    );

  const candidates: Array<{ x: number; y: number }> = [];
  const isNewThread = threadNotes.length === 0;
  for (let ring = 0; ring < 5; ring += 1) {
    const right = { x: maxX + gap + ring * stepX, y: minY };
    const belowGap = isNewThread ? 86 : gap + 20;
    const below = { x: minX, y: maxY + belowGap + ring * stepY };
    const left = { x: minX - width - gap - ring * stepX, y: minY };
    const above = { x: minX, y: minY - testHeight - gap - ring * stepY };
    if (isNewThread) {
      candidates.push(below, right, left, above);
    } else {
      candidates.push(right, below, left, above);
    }
    for (let column = 1; column <= 3; column += 1) {
      candidates.push({
        x: minX + column * stepX,
        y: maxY + belowGap + ring * stepY,
      });
    }
  }

  for (const candidate of candidates) {
    const x = Math.round(candidate.x);
    const y = Math.round(candidate.y);
    if (x < -80) continue;
    if (!overlaps(x, y)) return { x, y };
  }
  return { x: Math.round(minX), y: Math.round(maxY + 60) };
}

export default function App() {
  const { locale, setLocale, t, formatDate } = useI18n();
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace(locale));
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ noteId: string; nonce: number } | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 1100);
  const [activeTab, setActiveTab] = useState<'read' | 'ask'>('read');
  const [composer, setComposer] = useState<{ open: boolean; editingId: string | null }>({
    open: false,
    editingId: null,
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [fitNonce, setFitNonce] = useState(0);
  const [introVisible, setIntroVisible] = useState(() => !sessionStorage.getItem('weft.intro'));
  const [introLeaving, setIntroLeaving] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const addedTimer = useRef<number | null>(null);

  const activeBoard = useMemo(
    () => workspace.boards.find((board) => board.id === workspace.activeBoardId) ?? workspace.boards[0],
    [workspace],
  );
  const localAnalysis = useMemo(() => analyzeBoard(activeBoard, locale), [activeBoard, locale]);
  const insight = useBoardInsight(activeBoard, localAnalysis, locale);
  const analysis = useMemo(() => mergeInsight(localAnalysis, insight), [localAnalysis, insight]);
  const editingNote = composer.editingId
    ? activeBoard.notes.find((note) => note.id === composer.editingId) ?? null
    : null;

  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      } catch {
        // Storage can be unavailable in private browsing; the session still works.
      }
    };
    const timer = window.setTimeout(save, 280);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [workspace]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1100px)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setPanelOpen(false);
    };
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!introVisible) return;
    const leaveTimer = window.setTimeout(() => setIntroLeaving(true), 1050);
    const removeTimer = window.setTimeout(() => {
      sessionStorage.setItem('weft.intro', 'seen');
      setIntroVisible(false);
    }, 1550);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, [introVisible]);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (addedTimer.current) window.clearTimeout(addedTimer.current);
    },
    [],
  );

  const showToast = useCallback(
    (message: string, action?: { label: string; run: () => void }) => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      const id = Date.now();
      setToast({ id, message, actionLabel: action?.label, action: action?.run });
      toastTimer.current = window.setTimeout(() => setToast(null), action ? 4600 : 2800);
    },
    [],
  );

  const updateActiveBoard = useCallback(
    (updater: (board: Board) => Board) => {
      setWorkspace((current) => ({
        ...current,
        boards: current.boards.map((board) =>
          board.id === current.activeBoardId ? updater(board) : board,
        ),
      }));
    },
    [],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      updateActiveBoard((board) => ({
        ...board,
        notes: board.notes.map((note) => (note.id === id ? { ...note, ...patch } : note)),
      }));
    },
    [updateActiveBoard],
  );

  const addNoteWithPayload = useCallback(
    (payload: { text: string; kind: NoteKind; author?: string }) => {
      const board = activeBoard;
      const assignment = assignThread(board, payload.text);
      const position = findOpenPosition(board, assignment.threadId, payload);
      const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const note: Note = {
        id,
        text: payload.text,
        kind: payload.kind,
        author: payload.author,
        threadId: assignment.threadId,
        x: position.x,
        y: position.y,
        width: 240,
        createdAt: Date.now(),
      };
      const newThread = assignment.created
        ? createThreadMeta(board, payload.text, assignment.threadId, locale)
        : null;
      setWorkspace((current) => ({
        ...current,
        boards: current.boards.map((item) =>
          item.id === board.id
            ? {
                ...item,
                notes: [...item.notes, note],
                threads: newThread ? [...item.threads, newThread] : item.threads,
              }
            : item,
        ),
      }));
      setJustAddedId(id);
      setSelectedNoteId(id);
      setFocusRequest({ noteId: id, nonce: Date.now() });
      if (addedTimer.current) window.clearTimeout(addedTimer.current);
      addedTimer.current = window.setTimeout(() => setJustAddedId(null), 1500);

      const meta = board.threads.find((thread) => thread.id === assignment.threadId);
      if (assignment.created) {
        showToast(t('toast.newThread'));
      } else if (meta) {
        showToast(t('toast.woven', { label: meta.label }));
      } else {
        showToast(t('toast.kindAdded', { kind: t(kindKeys[payload.kind]) }));
      }
      return note;
    },
    [activeBoard, locale, showToast, t],
  );

  const quickAdd = useCallback(
    (text: string) => {
      addNoteWithPayload({ text, kind: 'thought' });
      setActiveTab('read');
    },
    [addNoteWithPayload],
  );

  const saveComposer = useCallback(
    (payload: { text: string; kind: NoteKind; author?: string }) => {
      if (composer.editingId) {
        updateActiveBoard((board) => ({
          ...board,
          notes: board.notes.map((note) =>
            note.id === composer.editingId
              ? { ...note, text: payload.text, kind: payload.kind, author: payload.author }
              : note,
          ),
        }));
        setComposer({ open: false, editingId: null });
        showToast(t('toast.noteRefined'));
      } else {
        addNoteWithPayload(payload);
        setComposer({ open: false, editingId: null });
      }
    },
    [addNoteWithPayload, composer.editingId, showToast, t, updateActiveBoard],
  );

  const deleteNote = useCallback(
    (id: string) => {
      const note = activeBoard.notes.find((item) => item.id === id);
      if (!note) return;
      updateActiveBoard((board) => {
        const notes = board.notes.filter((item) => item.id !== id);
        const activeThreads = new Set(notes.map((item) => item.threadId));
        return {
          ...board,
          notes,
          threads: board.threads.filter((thread) => activeThreads.has(thread.id)),
        };
      });
      if (selectedNoteId === id) setSelectedNoteId(null);
      showToast(t('toast.noteRemoved'), {
        label: t('toast.undo'),
        run: () => {
          setWorkspace((current) => ({
            ...current,
            boards: current.boards.map((board) =>
              board.id === activeBoard.id
                ? { ...board, notes: [...board.notes, note] }
                : board,
            ),
          }));
          showToast(t('toast.noteRestored'));
        },
      });
    },
    [activeBoard, selectedNoteId, showToast, t, updateActiveBoard],
  );

  const createBoard = useCallback(() => {
    const id = `canvas-${Date.now()}`;
    const board: Board = {
      id,
      name: locale === 'zh' ? '未命名画布' : 'Untitled canvas',
      description: locale === 'zh' ? '一块新的思考之地。' : 'A new place to think.',
      color: threadPalette[Math.floor(Math.random() * threadPalette.length)],
      notes: [],
      threads: [],
      throughline: '',
      tensionTitle: '',
      tension: '',
      openQuestion: '',
      createdAt: Date.now(),
    };
    setWorkspace((current) => ({ boards: [board, ...current.boards], activeBoardId: id }));
    setSelectedNoteId(null);
    setSelectedThreadId(null);
    setFocusRequest(null);
    setActiveTab('read');
    showToast(t('toast.newCanvas'));
    if (window.innerWidth <= 1100) setPanelOpen(false);
  }, [locale, showToast, t]);

  const selectBoard = useCallback((id: string) => {
    setWorkspace((current) => ({ ...current, activeBoardId: id }));
    setSelectedNoteId(null);
    setSelectedThreadId(null);
    setFocusRequest(null);
    setActiveTab('read');
  }, []);

  const focusThread = useCallback(
    (id: string | null) => {
      setSelectedThreadId(id);
      setSelectedNoteId(null);
      if (id) {
        setActiveTab('read');
        setPanelOpen(true);
      }
    },
    [],
  );

  const focusNote = useCallback((id: string) => {
    setSelectedNoteId(id);
    setSelectedThreadId(null);
    setFocusRequest({ noteId: id, nonce: Date.now() });
    if (window.innerWidth <= 1100) setPanelOpen(false);
  }, []);

  const focusNoteFromPalette = useCallback(
    (note: Note) => {
      focusNote(note.id);
    },
    [focusNote],
  );

  const arrange = useCallback(() => {
    const threads = analysis.threads;
    if (!threads.length) {
      showToast(t('toast.needNotes'));
      return;
    }
    const positions = new Map<string, { x: number; y: number; index: number }>();
    const notesById = new Map(activeBoard.notes.map((note) => [note.id, note]));
    threads.forEach((thread, threadIndex) => {
      let y = 106;
      thread.noteIds.forEach((noteId) => {
        const note = notesById.get(noteId);
        if (!note) return;
        positions.set(noteId, {
          x: 52 + threadIndex * 278,
          y,
          index: threadIndex,
        });
        y += estimateNoteHeight(note) + 20;
      });
    });
    updateActiveBoard((board) => ({
      ...board,
      notes: board.notes.map((note) => {
        const position = positions.get(note.id);
        return position ? { ...note, x: position.x, y: position.y, width: 240 } : note;
      }),
    }));
    setSelectedThreadId(null);
    setFitNonce((value) => value + 1);
    showToast(t('toast.tidied'));
  }, [activeBoard.notes, analysis.threads, showToast, t, updateActiveBoard]);

  const openBrief = useCallback(() => {
    if (!activeBoard.notes.length) {
      showToast(t('toast.needNoteBrief'));
      return;
    }
    setBriefOpen(true);
  }, [activeBoard.notes.length, showToast, t]);

  const openComposer = useCallback(() => setComposer({ open: true, editingId: null }), []);
  const editNote = useCallback((id: string) => setComposer({ open: true, editingId: id }), []);

  const share = useCallback(async () => {
    if (!activeBoard.notes.length) {
      showToast(t('toast.needNoteShare'));
      return;
    }
    const dateLabel = formatDate();
    const markdown = buildBriefContent(
      activeBoard,
      analysis,
      dateLabel,
      locale,
    ).markdown;
    const title = `${activeBoard.name} — ${t('brief.working')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: markdown });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(markdown);
      showToast(t('toast.briefCopied'));
    } catch {
      showToast(t('toast.clipboard'));
    }
  }, [activeBoard, analysis, formatDate, locale, showToast, t]);

  const renameBoard = useCallback(
    (name: string) => {
      updateActiveBoard((board) => ({ ...board, name }));
    },
    [updateActiveBoard],
  );

  const askQuestion = useCallback(() => {
    setActiveTab('ask');
    setPanelOpen(true);
  }, []);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === 'zh' ? 'en' : 'zh';
    setWorkspace((current) => localizeWorkspace(current, next));
    setLocale(next);
  }, [locale, setLocale]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && key === 'n') {
        event.preventDefault();
        createBoard();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [createBoard]);

  return (
    <div className="app-shell">
      <TopBar
        board={activeBoard}
        panelOpen={panelOpen}
        onOpenPalette={() => setCommandOpen(true)}
        onOpenBrief={openBrief}
        onTogglePanel={() => setPanelOpen((current) => !current)}
        onShare={share}
        onRename={renameBoard}
        onAccount={() => showToast(t('toast.signedIn'))}
        locale={locale}
        onToggleLocale={toggleLocale}
      />
      <div className="workspace">
        <Sidebar
          boards={workspace.boards}
          activeBoard={activeBoard}
          analysis={analysis}
          selectedThreadId={selectedThreadId}
          onSelectBoard={selectBoard}
          onNewCanvas={createBoard}
          onFocusThread={focusThread}
          onPrivacy={() => showToast(t('toast.privacy'))}
          onSettings={() => showToast(t('toast.preferences'))}
        />

        <CanvasBoard
          key={`canvas-${activeBoard.id}`}
          board={activeBoard}
          analysis={analysis}
          selectedNoteId={selectedNoteId}
          selectedThreadId={selectedThreadId}
          focusRequest={focusRequest}
          justAddedId={justAddedId}
          fitNonce={fitNonce}
          onUpdateNote={updateNote}
          onSelectNote={setSelectedNoteId}
          onEditNote={editNote}
          onDeleteNote={deleteNote}
          onFocusThread={focusThread}
          onArrange={arrange}
          onQuickAdd={quickAdd}
          onOpenComposer={openComposer}
          panelOpen={panelOpen}
        />

        <SynthesisPanel
          key={`panel-${activeBoard.id}-${locale}`}
          board={activeBoard}
          analysis={analysis}
          open={panelOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFocusThread={focusThread}
          onFocusNote={focusNote}
          onOpenBrief={openBrief}
          onToggle={() => setPanelOpen(false)}
          onAskQuestion={askQuestion}
        />

        {!panelOpen && (
          <button className="panel-open-pill" onClick={() => setPanelOpen(true)}>
            <Sparkles size={14} />
            {t('toast.openAi')}
          </button>
        )}
      </div>

      {composer.open && (
        <ComposerModal
          open
          editingNote={editingNote}
          board={activeBoard}
          onClose={() => setComposer({ open: false, editingId: null })}
          onSave={saveComposer}
        />
      )}

      {commandOpen && (
        <CommandPalette
          open
          board={activeBoard}
          boards={workspace.boards}
          analysis={analysis}
          onClose={() => setCommandOpen(false)}
          onNewNote={openComposer}
          onNewCanvas={createBoard}
          onTidy={arrange}
          onOpenBrief={openBrief}
          onTogglePanel={() => setPanelOpen((current) => !current)}
          onFocusNote={focusNoteFromPalette}
          onSelectBoard={selectBoard}
          locale={locale}
          onToggleLocale={toggleLocale}
        />
      )}

      <BriefModal
        open={briefOpen}
        board={activeBoard}
        analysis={analysis}
        onClose={() => setBriefOpen(false)}
        onToast={showToast}
      />

      {toast && (
        <div className="toast" key={toast.id} role="status" aria-live="polite">
          <span className="toast-icon">
            <Sparkles size={13} />
          </span>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button className="toast-close" onClick={() => setToast(null)} aria-label={t('toast.dismiss')}>
            <X size={12} />
          </button>
        </div>
      )}

      {introVisible && (
        <div className={`intro-overlay ${introLeaving ? 'leaving' : ''}`} aria-hidden="true">
          <div className="intro-inner">
            <div className="intro-mark">
              <span className="intro-thread t1" />
              <span className="intro-thread t2" />
              <span className="intro-thread t3" />
              <span className="intro-dot" />
            </div>
            <div className="intro-word">weft</div>
            <div className="intro-tag">{t('intro.tagline')}</div>
            <div className="intro-progress">
              <span />
            </div>
          </div>
        </div>
      )}

      <button className="help-bubble" onClick={() => setCommandOpen(true)} aria-label={t('toast.help')}>
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
