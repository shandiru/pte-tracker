import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectDB, isMongoActive } from '../server/db.js';
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
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing. Add it in Vercel Project Settings > Environment Variables.');
    }

    await connectDB();
    if (!isMongoActive()) {
      throw new Error('Could not connect to MongoDB. Check MONGODB_URI and MongoDB Atlas network access.');
    }

    await seedDatabase();
    initialized = true;
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    await initialize();
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless] Initialization failed:', err);
    return res.status(503).json({
      error: err instanceof Error ? err.message : 'Service database initialization failed.',
    });
  }
}
