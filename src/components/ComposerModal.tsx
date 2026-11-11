import { BookOpen, HelpCircle, Lightbulb, Quote, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Board, Note, NoteKind } from '../types';
import type { MessageKey } from '../messages';
import { useI18n } from '../i18n-context';

interface ComposerModalProps {
  open: boolean;
  editingNote: Note | null;
  board: Board;
  onClose: () => void;
  onSave: (payload: { text: string; kind: NoteKind; author?: string }) => void;
}

const kinds: {
  id: NoteKind;
  labelKey: MessageKey;
  icon: React.ReactNode;
  hintKey: MessageKey;
  placeholderKey: MessageKey;
}[] = [
  {
    id: 'thought',
    labelKey: 'noteKind.thought',
    icon: <Lightbulb size={14} />,
    hintKey: 'composer.kindHint.thought',
    placeholderKey: 'composer.placeholder.thought',
  },
  {
    id: 'question',
    labelKey: 'noteKind.question',
    icon: <HelpCircle size={14} />,
    hintKey: 'composer.kindHint.question',
    placeholderKey: 'composer.placeholder.question',
  },
  {
    id: 'quote',
    labelKey: 'noteKind.quote',
    icon: <Quote size={14} />,
    hintKey: 'composer.kindHint.quote',
    placeholderKey: 'composer.placeholder.quote',
  },
  {
    id: 'source',
    labelKey: 'noteKind.source',
    icon: <BookOpen size={14} />,
    hintKey: 'composer.kindHint.source',
    placeholderKey: 'composer.placeholder.source',
  },
];

export function ComposerModal({ open, editingNote, board, onClose, onSave }: ComposerModalProps) {
  const { t } = useI18n();
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
      <div className="composer-modal" role="dialog" aria-modal="true" aria-label={t('composer.aria')}>
        <div className="composer-head">
          <div>
            <span className="modal-eyebrow">
              {editingNote ? t('composer.edit') : t('composer.new')}
            </span>
            <h2>{editingNote ? t('composer.editTitle') : t('composer.newTitle')}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('composer.close')}>
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
                <strong>{t(item.labelKey)}</strong>
                <small>{t(item.hintKey)}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="composer-field">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t(
              kinds.find((item) => item.id === kind)?.placeholderKey ??
                'composer.placeholder.thought',
            )}
            rows={5}
          />
          <div className="textarea-meta">
            <span>{t('composer.characters', { count: text.length })}</span>
            <span>
              {board.threads.length
                ? t('composer.nearestThread')
                : t('composer.newThread')}
            </span>
          </div>
        </div>

        {showAuthor && (
          <label className="author-field">
            <span>{kind === 'quote' ? t('composer.attribution') : t('composer.source')}</span>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder={
                kind === 'quote'
                  ? t('composer.attributionPlaceholder')
                  : t('composer.sourcePlaceholder')
              }
            />
          </label>
        )}

        <div className="composer-foot">
          <span className="composer-hint">
            <kbd>⌘</kbd>
            <kbd>↵</kbd>
            {t('composer.toSave')}
          </span>
          <div className="composer-actions">
            <button className="ghost-button" onClick={onClose}>
              {t('composer.cancel')}
            </button>
            <button
              className="primary-button"
              disabled={!text.trim()}
              onClick={() => onSave({ text: text.trim(), kind, author: author.trim() || undefined })}
            >
              {editingNote ? t('composer.saveChanges') : t('composer.add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
