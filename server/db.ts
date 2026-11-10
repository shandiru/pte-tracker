import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Database] MONGODB_URI not found in env. Running in local persistent storage mode.');
    return false;
  }

  try {
    console.log('[Database] Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log('[Database] Connected to MongoDB successfully.');
    return true;
  } catch (error) {
    console.warn('[Database] MongoDB connection failed or timed out. Falling back to persistent storage:', (error as Error).message);
    isConnected = false;
    return false;
  }
}

export function isMongoActive(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
