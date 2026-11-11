import { config, isConfigured } from './config.mjs';
import { buildAskMessages, buildInsightMessages } from './prompts.mjs';

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ASK_TIMEOUT_MS = 60_000;
const INSIGHT_TIMEOUT_MS = 45_000;

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const asString = (value, max = 4000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  if (res.headersSent) {
    res.end();
    return;
  }
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sseStart(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Weft-Engine': 'deepseek',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

function sseWrite(res, payload) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sseError(res, code) {
  sseWrite(res, { type: 'error', code });
  res.end();
}

function sanitizeAskPayload(body) {
  if (!isObject(body)) return null;
  const question = asString(body.question, 4000);
  if (!question) return null;
  if (!isObject(body.board)) return null;
  const locale = body.locale === 'zh' ? 'zh' : 'en';
  const notes = Array.isArray(body.board.notes)
    ? body.board.notes
        .filter(isObject)
        .slice(0, 80)
        .map((note) => ({
          id: asString(note.id, 120),
          text: asString(note.text, 6000),
          kind: asString(note.kind, 20),
          author: asString(note.author, 160) || undefined,
          threadId: asString(note.threadId, 120),
        }))
        .filter((note) => note.id && note.text)
    : [];
  const analysis = isObject(body.analysis) ? body.analysis : {};
  const threads = Array.isArray(analysis.threads)
    ? analysis.threads
        .filter(isObject)
        .slice(0, 6)
        .map((thread) => ({
          id: asString(thread.id, 120),
          label: asString(thread.label, 160),
          short: asString(thread.short, 40),
          summary: asString(thread.summary, 500),
          noteIds: Array.isArray(thread.noteIds)
            ? thread.noteIds.map((id) => asString(id, 120)).filter(Boolean)
            : [],
        }))
        .filter((thread) => thread.id)
    : [];
  const history = Array.isArray(body.history)
    ? body.history
        .filter(isObject)
        .slice(-6)
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          text: asString(message.text, 4000),
        }))
        .filter((message) => message.text)
    : [];

  return {
    question,
    locale,
    board: { name: asString(body.board.name, 160), notes },
    analysis: {
      throughline: asString(analysis.throughline, 500),
      tensionTitle: asString(analysis.tensionTitle, 120),
      tension: asString(analysis.tension, 800),
      openQuestion: asString(analysis.openQuestion, 500),
      threads,
    },
    history,
  };
}

function sanitizeInsightPayload(body) {
  if (!isObject(body) || !isObject(body.board)) return null;
  const locale = body.locale === 'zh' ? 'zh' : 'en';
  const notes = Array.isArray(body.board.notes)
    ? body.board.notes
        .filter(isObject)
        .slice(0, 80)
        .map((note) => ({
          id: asString(note.id, 120),
          text: asString(note.text, 6000),
          kind: asString(note.kind, 20),
          author: asString(note.author, 160) || undefined,
        }))
        .filter((note) => note.id && note.text)
    : [];
  const analysis = isObject(body.analysis) ? body.analysis : {};
  const threads = Array.isArray(analysis.threads)
    ? analysis.threads
        .filter(isObject)
        .slice(0, 5)
        .map((thread) => ({
          id: asString(thread.id, 120),
          label: asString(thread.label, 160),
          summary: asString(thread.summary, 500),
          noteIds: Array.isArray(thread.noteIds)
            ? thread.noteIds.map((id) => asString(id, 120)).filter(Boolean)
            : [],
        }))
        .filter((thread) => thread.id)
    : [];
  if (!notes.length || !threads.length) return null;
  return {
    locale,
    board: { name: asString(body.board.name, 160), notes },
    analysis: { threads },
  };
}

async function callUpstream(messages, options = {}) {
  const body = {
    model: config.model,
    messages,
    stream: Boolean(options.stream),
    temperature: options.temperature ?? 0.55,
    max_tokens: options.maxTokens ?? 900,
    enable_thinking: false,
  };
  if (options.stream) body.stream_options = { include_usage: true };
  if (options.json) body.response_format = { type: 'json_object' };

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    Accept: options.stream ? 'text/event-stream' : 'application/json',
  };

  const send = (withJson) =>
    fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(withJson ? { ...body, response_format: { type: 'json_object' } } : body),
      signal: options.signal,
    });

  let response = await send(Boolean(options.json));
  // A few OpenAI-compatible endpoints reject response_format. Retry once as plain JSON.
  if (response.status === 400 && options.json) {
    try {
      await response.body?.cancel();
    } catch {
      // ignore
    }
    response = await send(false);
  }
  return response;
}

function extractContent(payload) {
  return payload?.choices?.[0]?.message?.content ?? '';
}

function parseJsonObject(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

async function handleAsk(req, res) {
  let raw;
  try {
    raw = await readJsonBody(req);
  } catch (error) {
    sendJson(res, error.status ?? 400, { error: 'bad_request' });
    return;
  }

  const payload = sanitizeAskPayload(raw);
  if (!payload) {
    sendJson(res, 400, { error: 'bad_request' });
    return;
  }
  if (!isConfigured) {
    sseStart(res);
    sseError(res, 'not_configured');
    return;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ASK_TIMEOUT_MS);
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);

  try {
    const upstream = await callUpstream(buildAskMessages(payload), {
      stream: true,
      temperature: 0.6,
      maxTokens: 900,
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('[weft] ask upstream error', upstream.status, detail.slice(0, 400));
      sseStart(res);
      sseError(res, upstream.status === 401 || upstream.status === 403 ? 'auth' : 'upstream');
      return;
    }

    sseStart(res);
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage = null;
    let finished = false;

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') {
          finished = true;
          break;
        }
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        if (event.usage) usage = event.usage;
        const delta = event.choices?.[0]?.delta;
        const text = delta?.content;
        if (typeof text === 'string' && text) {
          sseWrite(res, { type: 'delta', text });
        }
      }
    }

    sseWrite(res, { type: 'done', usage, model: config.model });
    res.end();
  } catch (error) {
    if (res.writableEnded) return;
    if (error?.name === 'AbortError' && !timedOut) return; // Client went away.
    console.error('[weft] ask failed', timedOut ? 'timeout' : error?.name ?? 'error');
    if (!res.headersSent) sseStart(res);
    sseError(res, timedOut ? 'timeout' : 'unavailable');
  } finally {
    clearTimeout(timeout);
    res.off('close', onClose);
  }
}

async function handleInsight(req, res) {
  let raw;
  try {
    raw = await readJsonBody(req);
  } catch (error) {
    sendJson(res, error.status ?? 400, { error: 'bad_request' });
    return;
  }

  const payload = sanitizeInsightPayload(raw);
  if (!payload) {
    sendJson(res, 400, { error: 'bad_request' });
    return;
  }
  if (!isConfigured) {
    sendJson(res, 503, { error: 'not_configured' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INSIGHT_TIMEOUT_MS);
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on('close', onClose);

  try {
    const upstream = await callUpstream(buildInsightMessages(payload), {
      temperature: 0.35,
      maxTokens: 1100,
      json: true,
      signal: controller.signal,
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('[weft] insight upstream error', upstream.status, detail.slice(0, 400));
      sendJson(res, 502, { error: 'upstream' });
      return;
    }

    const result = await upstream.json();
    const content = extractContent(result);
    let insight;
    try {
      insight = parseJsonObject(content);
    } catch {
      console.error('[weft] insight returned invalid JSON');
      sendJson(res, 502, { error: 'invalid_json' });
      return;
    }
    sendJson(res, 200, { insight, model: config.model });
  } catch (error) {
    console.error('[weft] insight failed', error?.name ?? 'error');
    sendJson(res, 504, { error: 'unavailable' });
  } finally {
    clearTimeout(timeout);
    res.off('close', onClose);
  }
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export async function handleApiRequest(req, res) {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '');

  if (pathname !== '/api/ask' && pathname !== '/api/insight') {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  if (!isSameOrigin(req)) {
    sendJson(res, 403, { error: 'forbidden_origin' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  if (pathname === '/api/ask') await handleAsk(req, res);
  else await handleInsight(req, res);
}
