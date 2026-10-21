import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import apiRouter from './src/server/routes.js';
import { db } from './src/server/db.js';

async function main() {
  const app = express();
  const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;

  // Initialize Database
  try {
    await db.init();
  } catch (err: any) {
    console.error('[Server] Database initialization warning:', err.message);
  }

  // Middleware
  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ extended: true, limit: '150mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // In development, mount Vite dev middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/data/**/*',
            '**/data/candles/**',
            '**/data/db_store.json',
            '**/*.json',
            '**/FILE ORI/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] XAUUSD Backtest Lab V4 listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
