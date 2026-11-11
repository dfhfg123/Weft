# Weft

**A calm canvas for thinking.**

Weft is a spatial thinking surface. Pin fragments wherever they occur to you, and Weft quietly finds the threads between them — then turns those threads into a throughline, a live tension, and a working brief you can share.

Everything runs on your device. No account, no server, no tracking.

## What it does

- **A real canvas** — pan, zoom, drag notes, tidy by meaning, and move between canvases.
- **Threads, not folders** — notes are grouped automatically by concept and language overlap.
- **Canvas intelligence** — a local synthesis engine derives the throughline, the live tension, an open question, source notes, and follow-up prompts.
- **Ask the canvas** — grounded answers built from the notes on the current canvas, with citations back to the source notes.
- **Working brief** — a typographic, shareable markdown brief generated from the same analysis.
- **Built for the keyboard** — `N` to capture, `⌘K` to search, `0` to fit, `Esc` to clear focus.
- **Responsive** — a full three-pane workspace on desktop; a focused, touch-friendly canvas on mobile.
- **Private by design** — workspace state lives in `localStorage`; fonts and all assets are self-hosted.

## Run it

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

## How the intelligence works

There is no remote model call. `src/ai.ts` implements a compact, deterministic text engine:

1. Tokenise notes with stop-word removal and light stemming.
2. Expand tokens through a synonym/concept map.
3. Build TF-IDF vectors with concept boosting and compare them by cosine similarity.
4. Cluster related notes into threads with agglomerative grouping.
5. Derive the canvas throughline, tension, open question, and brief from the resulting thread structure.
6. Route questions by intent (`summarise`, `tension`, `next step`, `connect`, `missing voice`) and answer using the actual canvas analysis, never canned copy.

This keeps the product instant, offline-capable, and fully inspectable.

## Stack

- React 19 + TypeScript
- Vite
- `lucide-react`
- Instrument Serif + Geist (self-hosted, SIL Open Font License)
- Oxlint

## Structure

```
src/
  ai.ts                 local semantic engine + synthesis
  brief.ts              shared brief/markdown generator
  data.ts               seed canvases, palette, note metadata
  types.ts              domain types
  App.tsx               workspace state, actions, shortcuts
  components/           canvas, notes, panel, composer, palette, brief
  styles.css            design system and responsive layout
public/fonts/           self-hosted woff2 files
```
