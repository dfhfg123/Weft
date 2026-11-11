import { BookOpen, HelpCircle, Lightbulb, Quote, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Board, Note, NoteKind } from '../types';

interface ComposerModalProps {
  open: boolean;
  editingNote: Note | null;
  board: Board;
  onClose: () => void;
  onSave: (payload: { text: string; kind: NoteKind; author?: string }) => void;
}

const kinds: { id: NoteKind; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'thought', label: 'Thought', icon: <Lightbulb size={14} />, hint: 'A half-formed idea' },
  { id: 'question', label: 'Question', icon: <HelpCircle size={14} />, hint: 'Something to investigate' },
  { id: 'quote', label: 'Quote', icon: <Quote size={14} />, hint: 'Words worth keeping' },
  { id: 'source', label: 'Source', icon: <BookOpen size={14} />, hint: 'Evidence or reference' },
];

export function ComposerModal({ open, editingNote, board, onClose, onSave }: ComposerModalProps) {
  const [kind, setKind] = useState<NoteKind>(editingNote?.kind ?? 'thought');
  const [text, setText] = useState(editingNote?.text ?? '');
  const [author, setAuthor] = useState(editingNote?.author ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (text.trim()) onSave({ text: text.trim(), kind, author: author.trim() || undefined });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, onSave, text, kind, author]);

  if (!open) return null;

  const showAuthor = kind === 'quote' || kind === 'source';

  return (
    <div className="modal-backdrop composer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="composer-modal" role="dialog" aria-modal="true" aria-label="Compose note">
        <div className="composer-head">
          <div>
            <span className="modal-eyebrow">{editingNote ? 'Edit note' : 'New note'}</span>
            <h2>{editingNote ? 'Refine the thought.' : 'What’s on your mind?'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="kind-picker">
          {kinds.map((item) => (
            <button
              key={item.id}
              className={`kind-option ${kind === item.id ? 'active' : ''}`}
              onClick={() => setKind(item.id)}
            >
              <span className="kind-option-icon">{item.icon}</span>
              <span className="kind-option-copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="composer-field">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              kind === 'question'
                ? 'Ask the question underneath the question…'
                : kind === 'quote'
                  ? 'Paste the words you want to keep…'
                  : kind === 'source'
                    ? 'Add a piece of evidence, a statistic, or a reference…'
                    : 'Start anywhere. A fragment is enough.'
            }
            rows={5}
          />
          <div className="textarea-meta">
            <span>{text.length} characters</span>
            <span>{board.threads.length ? 'Weft will find the nearest thread' : 'This will start a new thread'}</span>
          </div>
        </div>

        {showAuthor && (
          <label className="author-field">
            <span>{kind === 'quote' ? 'Attribution' : 'Source'}</span>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder={kind === 'quote' ? 'Who said it?' : 'Where is this from?'}
            />
          </label>
        )}

        <div className="composer-foot">
          <span className="composer-hint">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            to save
          </span>
          <div className="composer-actions">
            <button className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={!text.trim()}
              onClick={() => onSave({ text: text.trim(), kind, author: author.trim() || undefined })}
            >
              {editingNote ? 'Save changes' : 'Add to canvas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
