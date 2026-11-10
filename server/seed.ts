import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './db.js';
import { seedDatabase } from './storage.js';

async function runSeed() {
  console.log('[Seed] Starting database seed...');
  await connectDB();
  await seedDatabase();
  console.log('[Seed] Seeding completed successfully. Roadmap weeks and default settings initialized.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});
