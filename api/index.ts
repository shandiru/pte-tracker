import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectDB } from '../server/db.js';
import { seedDatabase } from '../server/storage.js';
import { apiRouter } from '../server/routes/api.js';
import { pinAuthMiddleware } from '../server/middleware/pin.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(pinAuthMiddleware);
app.use('/api', apiRouter);

let initialized = false;
async function initialize() {
  if (!initialized) {
    try {
      await connectDB();
      await seedDatabase();
      initialized = true;
    } catch (err) {
      console.error('[Vercel Serverless] DB init error:', err);
    }
  }
}

export default async function handler(req: Request, res: Response) {
  await initialize();
  return app(req, res);
}
