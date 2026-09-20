import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { connectDb } from '../src/lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDb();
  } catch (err) {
    console.error('Vercel Serverless DB connection error:', err);
  }
  return app(req as any, res as any);
}
