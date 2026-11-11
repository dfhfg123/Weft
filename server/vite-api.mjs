import { handleApiRequest } from './api.mjs';

export function weftApi() {
  const middleware = (req, res, next) => {
    if (req.url !== '/api' && !req.url?.startsWith('/api/')) {
      next();
      return;
    }
    handleApiRequest(req, res).catch((error) => {
      console.error('[weft] api middleware error', error?.message ?? error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'internal' }));
      } else {
        res.end();
      }
    });
  };

  return {
    name: 'weft-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
