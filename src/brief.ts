import type { Analysis, Board, Note, ThreadView } from './types';
import type { Locale } from './messages';
import { countUnit } from './messages';

export interface BriefContent {
  markdown: string;
  threads: ThreadView[];
  sources: Note[];
  probes: string[];
}

export function buildBriefContent(
  board: Board,
  analysis: Analysis,
  dateLabel: string,
  locale: Locale = 'en',
): BriefContent {
  const threads = analysis.threads.slice(0, 4);
  const sources = board.notes.slice(0, 12);
  const noteUnit = countUnit(locale, 'note', analysis.noteCount);
  const threadUnit = countUnit(locale, 'thread', analysis.threads.length);
  const firstThread = analysis.threads[0];
  const gravity =
    locale === 'zh'
      ? firstThread?.label ?? '仍在形成'
      : firstThread?.label.toLowerCase() ?? 'still forming';

  const probes =
    locale === 'zh'
      ? [
          `写出一条针对「${analysis.throughline}」的最强反论，并把它加到画布上。`,
          `把开放问题变成一次为期一周的验证：${analysis.openQuestion}`,
          '找到一个这个模式破裂的真实例子——并记下它告诉了你什么。',
        ]
      : [
          `Write the strongest counter-argument to “${analysis.throughline}” and add it to the canvas.`,
          `Turn the open question into a one-week probe: ${analysis.openQuestion}`,
          'Find one real example where this pattern breaks — and note what that tells you.',
        ];

  const markdown =
    locale === 'zh'
      ? `# ${board.name} — 工作简报

_由 ${analysis.noteCount} ${noteUnit}织成 · ${dateLabel}_

## 主线

> ${analysis.throughline}

这块画布有 ${analysis.noteCount} ${noteUnit}，分布在 ${analysis.threads.length} ${threadUnit}中。重心是「${gravity}」。放在一起读，笔记不断回到「${gravity}」——这份简报保留分歧，而不是把它抹平。

## 流动中的线索

${threads
  .map(
    (thread, index) =>
      `### ${String(index + 1).padStart(2, '0')} · ${thread.label}\n\n${thread.summary}\n\n_这条线索中有 ${thread.noteIds.length} ${countUnit(locale, 'note', thread.noteIds.length)}。_`,
  )
  .join('\n\n')}

## 现场张力

**${analysis.tensionTitle}** —— ${analysis.tension}

## 开放问题

${analysis.openQuestion}

## 下一轮验证

${probes.map((probe) => `- ${probe}`).join('\n')}

## 来源

${sources.map((note, index) => `${index + 1}. “${note.text}”${note.author ? ` —— ${note.author}` : ''}`).join('\n')}

---

_由 Weft 织成 · 模型辅助综合 · ${dateLabel}_
`
      : `# ${board.name} — Working brief

_Woven from ${analysis.noteCount} ${noteUnit} · ${dateLabel}_

## The throughline

> ${analysis.throughline}

The canvas holds ${analysis.noteCount} ${noteUnit} across ${analysis.threads.length} ${threadUnit}. The centre of gravity is ${gravity}. Read together, the notes keep returning to ${gravity} — and the brief holds the disagreement rather than smoothing it away.

## Threads in motion

${threads
  .map(
    (thread, index) =>
      `### ${String(index + 1).padStart(2, '0')} · ${thread.label}\n\n${thread.summary}\n\n_${thread.noteIds.length} ${countUnit(locale, 'note', thread.noteIds.length)} in this thread._`,
  )
  .join('\n\n')}

## The live tension

**${analysis.tensionTitle}** — ${analysis.tension}

## The open question

${analysis.openQuestion}

## Next probes

${probes.map((probe) => `- ${probe}`).join('\n')}

## Sources

${sources.map((note, index) => `${index + 1}. “${note.text}”${note.author ? ` — ${note.author}` : ''}`).join('\n')}

---

_Woven with Weft · model-assisted synthesis · ${dateLabel}_
`;

  return { markdown, threads, sources, probes };
}
