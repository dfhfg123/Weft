import type { Analysis, Board, Note, ThreadView } from './types';

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
): BriefContent {
  const threads = analysis.threads.slice(0, 4);
  const sources = board.notes.slice(0, 12);
  const probes = [
    `Write the strongest counter-argument to “${analysis.throughline}” and add it to the canvas.`,
    `Turn the open question into a one-week probe: ${analysis.openQuestion}`,
    'Find one real example where this pattern breaks — and note what that tells you.',
  ];
  const gravity = analysis.threads[0]?.label.toLowerCase() ?? 'still forming';
  const markdown = `# ${board.name} — Working brief

_Woven from ${analysis.noteCount} notes · ${dateLabel}_

## The throughline

> ${analysis.throughline}

The canvas holds ${analysis.noteCount} notes across ${analysis.threads.length} threads. The centre of gravity is ${gravity}. Read together, the notes keep returning to ${gravity} — and the brief holds the disagreement rather than smoothing it away.

## Threads in motion

${threads
  .map(
    (thread, index) =>
      `### ${String(index + 1).padStart(2, '0')} · ${thread.label}\n\n${thread.summary}\n\n_${thread.noteIds.length} notes in this thread._`,
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

_Drafted with Weft · on-device synthesis · ${dateLabel}_
`;
  return { markdown, threads, sources, probes };
}
