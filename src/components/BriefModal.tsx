import { Check, Copy, Download, FileText, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buildBriefContent } from '../brief';
import type { Analysis, Board } from '../types';
import { countUnit } from '../messages';
import { useI18n } from '../i18n-context';

interface BriefModalProps {
  open: boolean;
  board: Board;
  analysis: Analysis;
  onClose: () => void;
  onToast: (message: string) => void;
}

export function BriefModal({ open, board, analysis, onClose, onToast }: BriefModalProps) {
  const { t, locale, formatDate } = useI18n();
  const dateLabel = formatDate();
  const [copied, setCopied] = useState(false);
  const brief = useMemo(
    () => buildBriefContent(board, analysis, dateLabel, locale),
    [analysis, board, dateLabel, locale],
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief.markdown);
      setCopied(true);
      onToast(t('brief.toastCopied'));
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast(t('brief.toastClipboard'));
    }
  };

  const download = () => {
    const blob = new Blob([brief.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const slug = board.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    anchor.download = `${slug || 'weft'}-brief.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    onToast(t('brief.toastDownloaded'));
  };

  return (
    <div className="modal-backdrop brief-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="brief-modal" role="dialog" aria-modal="true" aria-label={t('brief.aria')}>
        <div className="brief-toolbar">
          <div className="brief-toolbar-label">
            <FileText size={14} />
            {t('brief.working')}
            <span className="brief-ai">
              <Sparkles size={10} />
              {t('brief.onDevice')}
            </span>
          </div>
          <div className="brief-toolbar-actions">
            <button className="ghost-button small" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? t('brief.copied') : t('brief.copy')}
            </button>
            <button className="ghost-button small" onClick={download}>
              <Download size={13} />
              {t('brief.download')}
            </button>
            <button className="icon-button" onClick={onClose} aria-label={t('brief.close')}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="brief-paper">
          <div className="brief-header">
            <div className="brief-kicker">{t('brief.kicker', { date: dateLabel })}</div>
            <h1>{board.name}</h1>
            <p className="brief-deck">
              {t('brief.deck', {
                notes: `${analysis.noteCount} ${countUnit(locale, 'note', analysis.noteCount)}`,
                threads: `${analysis.threads.length} ${countUnit(
                  locale,
                  'thread',
                  analysis.threads.length,
                )}`,
              })}
            </p>
          </div>

          <div className="brief-rule" />

          <section className="brief-throughline">
            <span className="brief-label">{t('brief.throughline')}</span>
            <blockquote>{analysis.throughline}</blockquote>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">01</span>
              <h2>{t('brief.section1')}</h2>
            </div>
            <p className="brief-lede">
              {t('brief.lede', {
                thread:
                  locale === 'zh'
                    ? `「${analysis.threads[0]?.label ?? '仍在形成的形状'}」`
                    : (analysis.threads[0]?.label.toLowerCase() ?? 'a shape still forming'),
              })}
            </p>
            <div className="brief-thread-grid">
              {brief.threads.map((thread, index) => (
                <div className="brief-thread" key={thread.id}>
                  <span className="brief-thread-index" style={{ color: thread.color }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{thread.label}</h3>
                  <p>{thread.summary}</p>
                  <span className="brief-thread-count">
                    {t('panel.threadNotes', {
                      count: thread.noteIds.length,
                      unit: countUnit(locale, 'note', thread.noteIds.length),
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">02</span>
              <h2>{t('brief.section2')}</h2>
            </div>
            <div className="brief-tension">
              <h3>{analysis.tensionTitle}</h3>
              <p>{analysis.tension}</p>
            </div>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">03</span>
              <h2>{t('brief.section3')}</h2>
            </div>
            <p className="brief-question">{analysis.openQuestion}</p>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">04</span>
              <h2>{t('brief.section4')}</h2>
            </div>
            <ol className="brief-probes">
              {brief.probes.map((probe) => (
                <li key={probe}>{probe}</li>
              ))}
            </ol>
          </section>

          <section className="brief-section brief-sources">
            <div className="brief-section-head">
              <span className="brief-number">05</span>
              <h2>{t('brief.section5')}</h2>
            </div>
            <div className="brief-source-list">
              {brief.sources.map((note, index) => (
                <div className="brief-source" key={note.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>
                    {note.text}
                    {note.author && <em> — {note.author}</em>}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="brief-footer">
            <span className="brief-footer-mark">weft</span>
            <span>{t('brief.footer', { date: dateLabel })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
