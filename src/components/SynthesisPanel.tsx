import {
  ArrowUp,
  ArrowUpRight,
  FileText,
  PanelRightClose,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Analysis, AskResult, Board, ChatMessage, ThreadView } from '../types';
import { askCanvas } from '../ai';
import {
  cleanAnswerText,
  extractCitations,
  streamModelAnswer,
} from '../ai-client';
import { useI18n } from '../i18n-context';
import type { MessageKey } from '../messages';

interface SynthesisPanelProps {
  board: Board;
  analysis: Analysis;
  open: boolean;
  activeTab: 'read' | 'ask';
  onTabChange: (tab: 'read' | 'ask') => void;
  onFocusThread: (id: string) => void;
  onFocusNote: (id: string) => void;
  onOpenBrief: () => void;
  onToggle: () => void;
  onAskQuestion: (question: string) => void;
}

const promptKeys: MessageKey[] = [
  'prompt.throughline',
  'prompt.tension',
  'prompt.next',
];

function renderParagraphs(text: string) {
  return text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>);
}

function ThreadCard({
  thread,
  index,
  onFocus,
}: {
  thread: ThreadView;
  index: number;
  onFocus: () => void;
}) {
  const { t } = useI18n();
  return (
    <button className="thread-card" onClick={onFocus}>
      <span className="thread-card-index" style={{ color: thread.color }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="thread-card-copy">
        <span className="thread-card-top">
          <strong>{thread.label}</strong>
          <span className="thread-card-count">
            {t('panel.threadNotes', {
              count: thread.noteIds.length,
              unit: t(
                thread.noteIds.length === 1 ? 'unit.noteOne' : 'unit.noteMany',
              ),
            })}
          </span>
        </span>
        <span className="thread-card-summary">{thread.summary}</span>
      </span>
      <span className="thread-card-arrow">
        <ArrowUpRight size={14} />
      </span>
    </button>
  );
}

export function SynthesisPanel({
  board,
  analysis,
  open,
  activeTab,
  onTabChange,
  onFocusThread,
  onFocusNote,
  onOpenBrief,
  onToggle,
  onAskQuestion,
}: SynthesisPanelProps) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearTimers = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (streamRef.current) window.clearInterval(streamRef.current);
    timerRef.current = null;
    streamRef.current = null;
  };

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: messages.length > 1 ? 'smooth' : 'auto',
    });
  }, [messages, thinking]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (window.innerWidth > 1100 || document.querySelector('.modal-backdrop')) return;
      onToggle();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onToggle]);

  useEffect(
    () => () => {
      clearTimers();
      abortRef.current?.abort();
    },
    [],
  );

  const startStream = (result: AskResult, question: string, engine: 'model' | 'local') => {
    setThinking(false);
    const id = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id,
        role: 'assistant',
        text: '',
        sources: result.sources,
        streaming: true,
        question,
        followUps: result.followUps,
        engine,
      },
    ]);
    let cursor = 0;
    const chunk = result.text.length > 420 ? 3 : 2;
    streamRef.current = window.setInterval(() => {
      cursor = Math.min(result.text.length, cursor + chunk);
      const nextText = result.text.slice(0, cursor);
      setMessages((current) =>
        current.map((message) => (message.id === id ? { ...message, text: nextText } : message)),
      );
      if (cursor >= result.text.length) {
        if (streamRef.current) window.clearInterval(streamRef.current);
        streamRef.current = null;
        setMessages((current) =>
          current.map((message) =>
            message.id === id ? { ...message, streaming: false } : message,
          ),
        );
      }
    }, 11);
  };

  const ask = (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (
      !question ||
      busyRef.current ||
      thinking ||
      messages.some((message) => message.streaming)
    ) {
      return;
    }
    if (question === t('prompt.brief') || question === t('palette.brief')) {
      setInput('');
      onOpenBrief();
      return;
    }

    busyRef.current = true;
    onTabChange('ask');
    onAskQuestion(question);
    setInput('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: question },
    ]);
    setThinking(true);

    const local = askCanvas(question, board, analysis, locale);
    const history = messages
      .filter((message) => message.role === 'user' || message.text.trim())
      .slice(-6)
      .map((message) => ({
        role: message.role,
        text:
          message.role === 'assistant' ? cleanAnswerText(message.text) : message.text,
      }));
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const assistantId = `assistant-${Date.now()}`;
    let streamingStarted = false;
    let rawAnswer = '';

    const finishWithLocal = () => {
      if (controller.signal.aborted) return;
      startStream(local, question, 'local');
      setThinking(false);
      busyRef.current = false;
    };

    const showToken = (text: string) => {
      if (controller.signal.aborted) return;
      rawAnswer += text;
      if (!streamingStarted) {
        streamingStarted = true;
        setThinking(false);
        setMessages((current) => [
          ...current,
          {
            id: assistantId,
            role: 'assistant',
            text,
            streaming: true,
            question,
            engine: 'model',
          },
        ]);
      } else {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, text: message.text + text }
              : message,
          ),
        );
      }
    };

    const finishWithModel = () => {
      if (!rawAnswer.trim()) {
        finishWithLocal();
        return;
      }
      const cited = extractCitations(rawAnswer, board.notes.map((note) => note.id));
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                streaming: false,
                sources: cited.length ? cited : local.sources,
                followUps: local.followUps,
                engine: 'model',
              }
            : message,
        ),
      );
      setThinking(false);
      busyRef.current = false;
    };

    streamModelAnswer({
      question,
      board,
      analysis,
      locale,
      history,
      signal: controller.signal,
      onDelta: showToken,
    })
      .then((answer) => {
        if (controller.signal.aborted) return;
        rawAnswer = answer || rawAnswer;
        finishWithModel();
      })
      .catch(() => {
        if (controller.signal.aborted) {
          // Unmount, board switch, or a newer question: no stale state updates.
          if (abortRef.current === controller) busyRef.current = false;
          return;
        }
        if (!streamingStarted) {
          finishWithLocal();
          return;
        }
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  streaming: false,
                  interrupted: true,
                  followUps: local.followUps,
                }
              : message,
          ),
        );
        setThinking(false);
        busyRef.current = false;
      })
      .finally(() => {
        if (abortRef.current === controller) abortRef.current = null;
      });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  const getNoteNumber = (id: string) => {
    const index = board.notes.findIndex((note) => note.id === id);
    return String(index + 1).padStart(2, '0');
  };

  const askPlaceholder =
    activeTab === 'ask' ? t('panel.placeholderFollow') : t('panel.placeholderAsk');
  const busy = thinking || messages.some((message) => message.streaming);

  return (
    <aside className={`synthesis-panel ${open ? 'open' : 'closed'}`} inert={!open}>
      <div className="panel-head">
        <div className="panel-orb" aria-hidden="true">
          <span />
          <span />
          <i />
        </div>
        <div className="panel-heading">
          <div className="panel-name">
            Weft <span className="ai-badge">AI</span>
          </div>
          <div className="panel-status">
            <i />
            {t('panel.status', {
              count: analysis.noteCount,
              unit: t(
                analysis.noteCount === 1 ? 'unit.noteOne' : 'unit.noteMany',
              ),
            })}
          </div>
        </div>
        <button className="panel-close" onClick={onToggle} aria-label={t('panel.close')}>
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'read' ? 'active' : ''}`}
          onClick={() => onTabChange('read')}
        >
          {t('panel.read')}
        </button>
        <button
          className={`panel-tab ${activeTab === 'ask' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('ask');
            window.setTimeout(() => inputRef.current?.focus(), 80);
          }}
        >
          {t('panel.ask')}
        </button>
        <span className="panel-live">
          <i />
          {t('panel.live')}
        </span>
      </div>

      {activeTab === 'read' ? (
        <div className="panel-body read-body">
          <section className="throughline-block">
            <div className="panel-eyebrow">
              <Sparkles size={11} />
              {t('panel.throughline')}
            </div>
            <h2>{analysis.throughline}</h2>
          </section>

          <section className="thread-block">
            <div className="panel-section-title">
              <span>{t('panel.threads')}</span>
              <span className="section-rule" />
              <span className="section-count">{analysis.threads.length}</span>
            </div>
            <div className="thread-card-list">
              {analysis.threads.slice(0, 4).map((thread, index) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  index={index}
                  onFocus={() => onFocusThread(thread.id)}
                />
              ))}
              {analysis.threads.length === 0 && (
                <div className="panel-empty-thread">
                  <span>{t('panel.noThreads')}</span>
                  <p>{t('panel.noThreadsCopy')}</p>
                </div>
              )}
            </div>
          </section>

          <section className="tension-card">
            <div className="tension-label">
              <span className="tension-glyph">
                <i />
                <i />
              </span>
              {t('panel.tension')}
            </div>
            <h3>{analysis.tensionTitle}</h3>
            <p>{analysis.tension}</p>
          </section>

          <button
            className="open-question-card"
            onClick={() => ask(analysis.openQuestion)}
          >
            <span className="panel-eyebrow">{t('panel.openQuestion')}</span>
            <span className="question-copy">{analysis.openQuestion}</span>
            <span className="question-arrow">
              <ArrowUpRight size={14} />
            </span>
          </button>

          <button className="brief-cta" onClick={onOpenBrief}>
            <span className="brief-cta-icon">
              <FileText size={16} />
            </span>
            <span>
              <strong>{t('panel.briefTitle')}</strong>
              <small>{t('panel.briefSubtitle')}</small>
            </span>
            <ArrowUpRight size={15} className="brief-cta-arrow" />
          </button>

          <div className="panel-footnote">
            <span className="footnote-dot" />
            {t('panel.footnote')}
          </div>
        </div>
      ) : (
        <div className="panel-body ask-body">
          <div ref={messagesRef} className="ask-scroll">
            {messages.length === 0 && (
              <div className="ask-intro">
                <div className="panel-eyebrow">
                  <Sparkles size={11} />
                  {t('panel.intelligence')}
                </div>
                <h2>{t('panel.askCanvas')}</h2>
                <p>{t('panel.askIntro')}</p>
                <div className="prompt-stack">
                  {promptKeys.map((key) => {
                    const prompt = t(key);
                    return (
                      <button key={key} className="prompt-chip" onClick={() => ask(prompt)}>
                        {prompt}
                        <ArrowUpRight size={13} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'user' ? (
                <div className="ask-user" key={message.id}>
                  <span>{t('panel.youAsked')}</span>
                  <p>{message.text}</p>
                </div>
              ) : (
                <div className="ask-answer" key={message.id}>
                  <div className="answer-head">
                    <span className="answer-orb">
                      <Sparkles size={10} />
                    </span>
                    <span>Weft</span>
                    {message.engine && (
                      <span className={`answer-engine ${message.engine}`}>
                        {t(
                          message.engine === 'model'
                            ? 'panel.engineModel'
                            : 'panel.engineLocal',
                        )}
                      </span>
                    )}
                    {message.streaming && <span className="stream-caret" />}
                  </div>
                  <div className="answer-text" aria-live="polite">
                    {renderParagraphs(cleanAnswerText(message.text))}
                  </div>
                  {!message.streaming && message.interrupted && (
                    <p className="answer-warning">{t('panel.interrupted')}</p>
                  )}
                  {!message.streaming && message.sources && message.sources.length > 0 && (
                    <div className="answer-sources">
                      <span className="sources-label">{t('panel.sources')}</span>
                      {message.sources.map((id) => (
                        <button key={id} className="source-chip" onClick={() => onFocusNote(id)}>
                          {getNoteNumber(id)}
                        </button>
                      ))}
                    </div>
                  )}
                  {!message.streaming && message.followUps && message.followUps.length > 0 && (
                    <div className="follow-ups">
                      {message.followUps.slice(0, 3).map((followUp) => (
                        <button key={followUp} className="follow-up" onClick={() => ask(followUp)}>
                          {followUp}
                          <ArrowUpRight size={11} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {thinking && (
              <div className="thinking-block">
                <div className="thinking-threads">
                  <span />
                  <span />
                  <span />
                </div>
                <span>
                  {t('panel.thinking', {
                    count: analysis.noteCount,
                    unit: t(
                      analysis.noteCount === 1 ? 'unit.noteOne' : 'unit.noteMany',
                    ),
                  })}
                </span>
              </div>
            )}
          </div>
          <div className="panel-footnote ask-footnote">
            <span className="footnote-dot" />
            {t('panel.askFootnote')}
          </div>
        </div>
      )}

      <form className="ask-bar" onSubmit={handleSubmit}>
        <div className="ask-bar-inner">
          <Sparkles size={14} className="ask-bar-spark" />
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={askPlaceholder}
            aria-label={t('panel.askAria')}
          />
          <button type="submit" disabled={!input.trim() || busy} aria-label={t('panel.send')}>
            <ArrowUp size={15} />
          </button>
        </div>
        <span className="ask-bar-hint">
          {activeTab === 'read' ? t('panel.hintRead') : t('panel.hintAsk')}
        </span>
      </form>
    </aside>
  );
}
