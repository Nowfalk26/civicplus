import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDb } from './lib/db';

dotenv.config();

import authRoutes from './routes/auth';
import complaintRoutes from './routes/complaint';
import userRoutes from './routes/user';
import analyticsRoutes from './routes/analytics';
import employeeRoutes from './routes/employee';
import { globalRateLimiter } from './middleware/rateLimit';

const app: Express = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration: Allow all Vercel domains, localhost, and custom frontend domains
app.use(
  cors({
    origin: (_origin, callback) => {
      // Allow any requesting origin for seamless deployment across Vercel, localhost, and custom domains
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

// Explicit OPTIONS pre-flight handler
app.options('*', cors());

import mongoose from 'mongoose';

// Request parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Root Status Endpoint (Instant 200 response)
const rootHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    backend: 'online',
    platform: 'Civics Plus Tamil Nadu Backend API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    message: 'Backend server is active and responding to requests.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      complaints: '/api/complaints',
      users: '/api/users',
      employees: '/api/employees',
      analytics: '/api/analytics',
    },
  });
};
app.get('/', rootHandler);
app.get('/api', rootHandler);

// System Health Check (Instant 200 response for Vercel and Frontend Status Badge)
const healthHandler = (_req: Request, res: Response) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (!isDbReady) {
    connectDb().catch(() => {});
  }
  res.status(200).json({
    status: 'healthy',
    backend: 'online',
    platform: 'Civics Plus - Tamil Nadu Civic Complaints',
    database: isDbReady ? 'connected' : 'connecting',
    readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    region: 'Tamil Nadu, India',
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Global Rate Limiting
app.use('/api', globalRateLimiter);

// Database readiness middleware: guarantees MongoDB is connected before operational API routes execute
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDb();
    next();
  } catch (err: any) {
    console.error('Database connection error in request middleware:', err.message);
    // Allow request to proceed to route handlers where possible, or return clean JSON error
    next();
  }
});

// Mount Routes (Mount both with /api prefix and without for maximum deployment compatibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/complaints', complaintRoutes);
app.use('/complaints', complaintRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/employees', employeeRoutes);
app.use('/employees', employeeRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/analytics', analyticsRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint was not found.',
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

export default app;
module.exports = app;
module.exports.default = app;
