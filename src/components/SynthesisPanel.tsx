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
  return (
    <button className="thread-card" onClick={onFocus}>
      <span className="thread-card-index" style={{ color: thread.color }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="thread-card-copy">
        <span className="thread-card-top">
          <strong>{thread.label}</strong>
          <span className="thread-card-count">
            {thread.noteIds.length} {thread.noteIds.length === 1 ? 'note' : 'notes'}
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<number | null>(null);
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

  useEffect(() => () => clearTimers(), []);

  const startStream = (result: AskResult, question: string) => {
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
    if (!question || thinking || messages.some((message) => message.streaming)) return;
    onTabChange('ask');
    onAskQuestion(question);
    setInput('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: question },
    ]);
    setThinking(true);
    timerRef.current = window.setTimeout(() => {
      const result = askCanvas(question, board, analysis);
      startStream(result, question);
      timerRef.current = null;
    }, 760);
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
    activeTab === 'ask' ? 'Ask a follow-up…' : 'Ask your canvas anything…';

  return (
    <aside className={`synthesis-panel ${open ? 'open' : 'closed'}`}>
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
            reading {analysis.noteCount} {analysis.noteCount === 1 ? 'note' : 'notes'}
          </div>
        </div>
        <button className="panel-close" onClick={onToggle} aria-label="Hide AI panel">
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'read' ? 'active' : ''}`}
          onClick={() => onTabChange('read')}
        >
          Read
        </button>
        <button
          className={`panel-tab ${activeTab === 'ask' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('ask');
            window.setTimeout(() => inputRef.current?.focus(), 80);
          }}
        >
          Ask
        </button>
        <span className="panel-live">
          <i />
          live
        </span>
      </div>

      {activeTab === 'read' ? (
        <div className="panel-body read-body">
          <section className="throughline-block">
            <div className="panel-eyebrow">
              <Sparkles size={11} />
              The throughline
            </div>
            <h2>{analysis.throughline}</h2>
          </section>

          <section className="thread-block">
            <div className="panel-section-title">
              <span>Threads in motion</span>
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
                  <span>No threads yet</span>
                  <p>Add a note and I’ll start noticing the patterns between things.</p>
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
              Live tension
            </div>
            <h3>{analysis.tensionTitle}</h3>
            <p>{analysis.tension}</p>
          </section>

          <button
            className="open-question-card"
            onClick={() => ask(analysis.openQuestion)}
          >
            <span className="panel-eyebrow">Open question</span>
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
              <strong>Weave this into a brief</strong>
              <small>A one-page synthesis, ready to share</small>
            </span>
            <ArrowUpRight size={15} className="brief-cta-arrow" />
          </button>

          <div className="panel-footnote">
            <span className="footnote-dot" />
            Private by design. Nothing leaves this device.
          </div>
        </div>
      ) : (
        <div className="panel-body ask-body">
          <div ref={messagesRef} className="ask-scroll">
            {messages.length === 0 && (
              <div className="ask-intro">
                <div className="panel-eyebrow">
                  <Sparkles size={11} />
                  Canvas intelligence
                </div>
                <h2>Ask the canvas.</h2>
                <p>
                  I read every note, follow the threads between them, and answer with the sources
                  I used.
                </p>
                <div className="prompt-stack">
                  {[
                    'What’s the throughline?',
                    'Where is the tension?',
                    'What should I do next?',
                  ].map((prompt) => (
                    <button key={prompt} className="prompt-chip" onClick={() => ask(prompt)}>
                      {prompt}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) =>
              message.role === 'user' ? (
                <div className="ask-user" key={message.id}>
                  <span>You asked</span>
                  <p>{message.text}</p>
                </div>
              ) : (
                <div className="ask-answer" key={message.id}>
                  <div className="answer-head">
                    <span className="answer-orb">
                      <Sparkles size={10} />
                    </span>
                    <span>Weft</span>
                    {message.streaming && <span className="stream-caret" />}
                  </div>
                  <div className="answer-text" aria-live="polite">{renderParagraphs(message.text)}</div>
                  {!message.streaming && message.sources && message.sources.length > 0 && (
                    <div className="answer-sources">
                      <span className="sources-label">Sources</span>
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
                <span>Reading across {analysis.noteCount} notes…</span>
              </div>
            )}
          </div>
          <div className="panel-footnote ask-footnote">
            <span className="footnote-dot" />
            Answers are grounded in the notes on this canvas.
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
            aria-label="Ask your canvas"
          />
          <button type="submit" disabled={!input.trim() || thinking} aria-label="Send question">
            <ArrowUp size={15} />
          </button>
        </div>
        <span className="ask-bar-hint">
          {activeTab === 'read' ? '↵ to ask · grounded in your notes' : 'Weft can make mistakes. Check the sources.'}
        </span>
      </form>
    </aside>
  );
}
