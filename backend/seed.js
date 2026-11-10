import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './db.js';
import { seedDatabase } from './storage.js';

async function runSeed() {
  console.log('[Backend Seed] Starting seed...');
  await connectDB();
  await seedDatabase();
  console.log('[Backend Seed] Roadmap and settings seeded successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('[Backend Seed] Error:', err);
  process.exit(1);
});
