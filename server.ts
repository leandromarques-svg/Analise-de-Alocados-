import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { PORT } from './src/server/config.ts';
import { createApp } from './src/server/app.ts';
import { warmAlocadosCache } from './src/server/alocadosCache.ts';

const app = createApp();

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (path.extname(req.path) && path.extname(req.path) !== '.html') {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[METARH Server] Server running on http://0.0.0.0:${PORT}`);
    warmAlocadosCache();
  });
}

startServer();
