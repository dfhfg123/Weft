# Weft

**A calm canvas for thinking.**

Weft is a spatial thinking surface. Pin fragments wherever they occur to you; Weft gathers them into threads, reads the throughline and the live tension, and lets you ask a real model to think across the canvas with you. When the thinking has a shape, weave it into a one-page working brief.

The canvas, semantic grouping, citations, and brief layout stay in the browser. Model calls are server-side: Weft refines its reading after a canvas changes, and answers questions when you ask.

## What it does

- **A real canvas** — pan, zoom, drag notes, tidy by meaning, and move between canvases.
- **Threads, not folders** — notes are grouped automatically by concept and language overlap, immediately and locally.
- **Model-assisted synthesis** — the local reading appears instantly, then DeepSeek refines thread names, summaries, the throughline, the live tension, and the open question.
- **Ask the canvas** — real streaming answers grounded in numbered notes, with citations mapped back to clickable source chips.
- **A working brief** — a typographic, shareable markdown brief generated from the same model-assisted reading.
- **Graceful fallback** — if the model is unconfigured, unreachable, or slow, the local canvas engine answers instead; the answer badge makes the mode visible.
- **Built for the keyboard** — `N` to capture, `⌘K` to search, `0` to fit, `Esc` to clear focus.
- **English and Chinese** — the interface, seed canvases, model prompts, synthesis, and brief follow the selected language; user-written notes and renamed canvases are never overwritten.
- **Responsive** — a full three-pane workspace on desktop; a focused, touch-friendly canvas on mobile.
- **Local-first by design** — workspace state lives in `localStorage`; fonts and all assets are self-hosted.

## Run it

```bash
npm install
cp .env.example .env.local
# Put your SiliconFlow API key in .env.local
npm run dev
```

Open <http://localhost:5199>.

Production:

```bash
npm run build
npm start
```

`npm start` serves `dist/` and the API from one Node process on port `4173` (override with `PORT`). `npm run preview` also mounts the API for a Vite preview on port `5200`.

Lint:

```bash
npm run lint
```

## Configuration

`.env.local` is git-ignored and is read only by the server process.

```dotenv
SILICONFLOW_API_KEY=...
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V4.1-Flash
PORT=4173
```

The key is never exposed through `import.meta.env`, the client bundle, or an API response. The browser only talks to same-origin `/api/*` routes. Do not add a `VITE_` prefix to these variables.

## How the intelligence works

1. **Local first.** `src/ai.ts` tokenises notes with stop-word removal, light stemming and CJK bigrams; expands them through a synonym/concept map; builds TF-IDF vectors; and assigns notes to threads by cosine similarity. The throughline, tension and open question have a complete local reading before any network request.
2. **Model refinement.** `src/use-insight.ts` debounces a canvas snapshot to `POST /api/insight`. The server asks DeepSeek for strict JSON that preserves the local thread ids and only refines labels, summaries and the canvas-level reading. Results are cached in `sessionStorage` for the exact canvas digest.
3. **Grounded questions.** `POST /api/ask` streams SSE deltas from DeepSeek. The server supplies numbered notes and requires inline `[n]` citations. The browser strips citation markers from the prose, maps them to note ids, and renders clickable source chips.
4. **Local fallback.** If the server reports `not_configured`, an upstream error, or a timeout, the client streams the local engine’s answer instead and labels it `local fallback`.
5. **Working brief.** `src/brief.ts` turns the same analysis into markdown and the typographic brief view.

`enable_thinking` is disabled for these calls so responses stay direct and fast; the reasoning field is not displayed.

## API

`POST /api/ask`

```json
{
  "question": "Where is the tension?",
  "locale": "en",
  "board": { "name": "Attention, reclaimed", "notes": [] },
  "analysis": { "threads": [], "throughline": "", "tensionTitle": "", "tension": "", "openQuestion": "" },
  "history": [{ "role": "user", "text": "..." }]
}
```

Responds with `text/event-stream` events:

```text
data: {"type":"delta","text":"The tension "}
data: {"type":"done","usage":{...},"model":"deepseek-ai/DeepSeek-V4.1-Flash"}
```

Errors arrive as `{"type":"error","code":"..."}` after the stream opens, or as JSON before it does.

`POST /api/insight` accepts the same canvas/analysis shape without `question` and returns:

```json
{ "insight": { "threads": [], "throughline": "", "tensionTitle": "", "tension": "", "openQuestion": "" }, "model": "..." }
```

Both routes validate and cap input, abort upstream work when the client disconnects, and never log note content.

## Privacy

- The workspace is stored in `localStorage`; preferences and the session reading cache stay in the browser.
- No analytics, accounts, or third-party page assets. Fonts are self-hosted.
- When a canvas changes (debounced) Weft sends a trimmed snapshot to the configured model provider to refine the reading; when you ask, it sends the canvas context and your question. The API key stays on the server.
- No note content is logged by the Weft server.
- The UI states this directly in the panel and sidebar.

## Stack

- React 19 + TypeScript
- Vite 8 + a small Node middleware (no server framework)
- SiliconFlow / DeepSeek chat completions (SSE)
- `lucide-react`
- Instrument Serif + Geist (self-hosted, SIL Open Font License; system CJK fallbacks)
- Oxlint

## Structure

```
server/
  api.mjs               /api/ask + /api/insight, validation, SSE relay
  config.mjs            server-only env loading
  prompts.mjs           grounded answer + JSON synthesis prompts
  index.mjs             production static + API server
  vite-api.mjs          Vite dev/preview middleware
src/
  ai.ts                 local semantic engine + local synthesis fallback
  ai-client.ts          SSE client, citation mapping, insight merge
  use-insight.ts        debounced model reading with session cache
  brief.ts              shared brief/markdown generator
  data.ts               localized seed canvases, palette, note metadata
  messages.ts           typed English/Chinese message tables and formatters
  i18n.tsx              locale provider, detection, document metadata
  i18n-context.ts       context and useI18n hook
  types.ts              domain types
  App.tsx               workspace state, actions, shortcuts
  components/           canvas, notes, panel, composer, palette, brief
  styles.css            design system and responsive layout
public/fonts/           self-hosted woff2 files
```
