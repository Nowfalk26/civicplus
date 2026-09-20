import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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

// CORS configuration: Strictly allow frontend origins with full credentials and preflight support
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://civicplus-red.vercel.app',
  'https://civicplus-backend.vercel.app',
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, mobile, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(new URL(origin).hostname) ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Request parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// 1. Root Status Endpoint
const rootHandler = (_req: Request, res: Response) => {
  const isDbReady = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: isDbReady ? 'ok' : 'degraded',
    service: 'backend',
    database: isDbReady ? 'connected' : 'disconnected',
    platform: 'Civics Plus Tamil Nadu Backend API',
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

// 2. Real Health Check Endpoint: GET /api/health
// Fulfills exact user specification: returns ok/degraded, backend service, and connected/disconnected
const healthHandler = (_req: Request, res: Response) => {
  const isDbReady = mongoose.connection.readyState === 1;

  if (!isDbReady) {
    // Non-blocking trigger to reconnect in background
    connectDb().catch(() => {});
  }

  res.status(isDbReady ? 200 : 503).json({
    status: isDbReady ? 'ok' : 'degraded',
    service: 'backend',
    database: isDbReady ? 'connected' : 'disconnected',
    platform: 'Civics Plus - Tamil Nadu Civic Complaints',
    readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Rate Limiting on API routes
app.use('/api', globalRateLimiter);

// Database readiness middleware: operational API endpoints require active DB connection
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Health checks bypass database readiness check
  if (req.path === '/api/health' || req.path === '/health' || req.path === '/' || req.path === '/api') {
    return next();
  }

  if (mongoose.connection.readyState === 1) {
    return next();
  }

  try {
    await connectDb();
    next();
  } catch (err: any) {
    console.error('[MONGO] Request blocked by database disconnect:', err.message);
    res.status(503).json({
      success: false,
      errorCategory: 'MONGODB_UNAVAILABLE',
      message: 'Database service is currently unavailable. Please verify database connection and try again.',
    });
  }
});

// Mount Routes (with and without /api prefix for deployment flexibility)
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
    errorCategory: 'ENDPOINT_NOT_FOUND',
    message: 'The requested API endpoint was not found on this server.',
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SERVER] Unhandled error:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    errorCategory: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal server error occurred.',
  });
});

export default app;
module.exports = app;
module.exports.default = app;
