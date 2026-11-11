import { Check, Copy, Download, FileText, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildBriefContent } from '../brief';
import type { Analysis, Board } from '../types';

interface BriefModalProps {
  open: boolean;
  board: Board;
  analysis: Analysis;
  onClose: () => void;
  onToast: (message: string) => void;
}

const dateLabel = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function BriefModal({ open, board, analysis, onClose, onToast }: BriefModalProps) {
  const [copied, setCopied] = useState(false);
  const brief = useMemo(() => buildBriefContent(board, analysis, dateLabel), [analysis, board]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief.markdown);
      setCopied(true);
      onToast('Brief copied to clipboard');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast('Could not access the clipboard');
    }
  };

  const download = () => {
    const blob = new Blob([brief.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${board.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-brief.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    onToast('Brief downloaded');
  };

  return (
    <div className="modal-backdrop brief-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="brief-modal" role="dialog" aria-modal="true" aria-label="Working brief">
        <div className="brief-toolbar">
          <div className="brief-toolbar-label">
            <FileText size={14} />
            Working brief
            <span className="brief-ai">
              <Sparkles size={10} />
              on-device
            </span>
          </div>
          <div className="brief-toolbar-actions">
            <button className="ghost-button small" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="ghost-button small" onClick={download}>
              <Download size={13} />
              Download
            </button>
            <button className="icon-button" onClick={onClose} aria-label="Close brief">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="brief-paper">
          <div className="brief-header">
            <div className="brief-kicker">Weft synthesis · {dateLabel}</div>
            <h1>{board.name}</h1>
            <p className="brief-deck">
              {analysis.noteCount} notes, {analysis.threads.length} threads, and one working theory.
            </p>
          </div>

          <div className="brief-rule" />

          <section className="brief-throughline">
            <span className="brief-label">The throughline</span>
            <blockquote>{analysis.throughline}</blockquote>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">01</span>
              <h2>What the canvas is saying</h2>
            </div>
            <p className="brief-lede">
              Read together, these notes keep returning to{' '}
              {analysis.threads[0]?.label.toLowerCase() ?? 'a shape still forming'}. Each thread
              sharpens a different edge of the same working theory — and this brief holds the
              disagreement rather than smoothing it away.
            </p>
            <div className="brief-thread-grid">
              {brief.threads.map((thread, index) => (
                <div className="brief-thread" key={thread.id}>
                  <span className="brief-thread-index" style={{ color: thread.color }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{thread.label}</h3>
                  <p>{thread.summary}</p>
                  <span className="brief-thread-count">{thread.noteIds.length} notes</span>
                </div>
              ))}
            </div>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">02</span>
              <h2>The live tension</h2>
            </div>
            <div className="brief-tension">
              <h3>{analysis.tensionTitle}</h3>
              <p>{analysis.tension}</p>
            </div>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">03</span>
              <h2>The open question</h2>
            </div>
            <p className="brief-question">{analysis.openQuestion}</p>
          </section>

          <section className="brief-section">
            <div className="brief-section-head">
              <span className="brief-number">04</span>
              <h2>Next probes</h2>
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
              <h2>Sources on the canvas</h2>
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
            <span>Drafted on-device · {dateLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
