import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './server/db.js';
import { seedDatabase } from './server/storage.js';
import { apiRouter } from './server/routes/api.js';
import { pinAuthMiddleware } from './server/middleware/pin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Initialize DB and Seed
  await connectDB();
  await seedDatabase();

  app.use(express.json({ limit: '10mb' }));

  // PIN protection middleware
  app.use(pinAuthMiddleware);

  // Mount API
  app.use('/api', apiRouter);

  // In development, hook up Vite dev server middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PTE Tracker] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[PTE Tracker] Failed to start server:', err);
  process.exit(1);
});
