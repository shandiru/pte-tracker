import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { seedDatabase } from './storage.js';
import { apiRouter } from './routes/api.js';
import { pinAuthMiddleware } from './middleware/pin.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-app-pin');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(pinAuthMiddleware);
app.use('/api', apiRouter);

async function start() {
  await connectDB();
  await seedDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PTE Tracker Backend] Running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[PTE Tracker Backend] Start error:', err);
  process.exit(1);
});

export default app;
