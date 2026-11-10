import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Database] MONGODB_URI not found in env. Running in local persistent storage mode.');
    return false;
  }

  try {
    console.log('[Database] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[Database] Connected to MongoDB Atlas successfully.');
    return true;
  } catch (error) {
    console.warn('[Database] MongoDB connection failed. Falling back to persistent storage:', error.message);
    isConnected = false;
    return false;
  }
}

export function isMongoActive() {
  return isConnected && mongoose.connection.readyState === 1;
}
