import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { handleApiRequest } from './api.mjs';
import { config } from './config.mjs';

const dist = resolve(process.cwd(), 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(req, res, file) {
  const ext = extname(file);
  const headers = {
    'Content-Type': mime[ext] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  if (file.includes(`${sep}assets${sep}`)) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['Cache-Control'] = 'no-cache';
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/api' || req.url?.startsWith('/api/')) {
      await handleApiRequest(req, res);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
      return;
    }

    if (!existsSync(dist)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Weft has not been built yet. Run `npm run build` first.');
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }

    const candidate = resolve(dist, `.${pathname}`);
    const insideDist = candidate === dist || candidate.startsWith(`${dist}${sep}`);
    if (insideDist && existsSync(candidate) && statSync(candidate).isFile()) {
      sendFile(req, res, candidate);
      return;
    }

    // Client-side app: unknown paths fall back to the shell.
    sendFile(req, res, resolve(dist, 'index.html'));
  } catch (error) {
    console.error('[weft] server error', error?.message ?? error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
    } else {
      res.end();
    }
  }
});

server.listen(config.port, () => {
  console.log(`Weft listening on http://localhost:${config.port}`);
  console.log(`Model: ${config.model}`);
  if (!config.apiKey) console.warn('SILICONFLOW_API_KEY is missing — Ask will use the local fallback.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
