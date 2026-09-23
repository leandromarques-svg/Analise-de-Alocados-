import express from 'express';
import compression from 'compression';
import alocadosRouter from './routes/alocados.ts';
import usersRouter from './routes/users.ts';
import commercialAssignmentsRouter from './routes/commercialAssignments.ts';
import sqlRouter from './routes/sql.ts';

export function createApp(options?: { normalizeApiPrefix?: boolean }) {
  const app = express();
  app.use(compression());
  app.use(express.json({ limit: '100mb' }));

  if (options?.normalizeApiPrefix) {
    app.use((req, _res, next) => {
      const raw = req.url || '/';
      const qIndex = raw.indexOf('?');
      const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
      const search = qIndex === -1 ? '' : raw.slice(qIndex);
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        next();
        return;
      }
      const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
      req.url = `/api${suffix}${search}`;
      next();
    });
  }

  app.use('/api', alocadosRouter);
  app.use('/api', usersRouter);
  app.use('/api', commercialAssignmentsRouter);
  app.use('/api/sql', sqlRouter);
  return app;
}
