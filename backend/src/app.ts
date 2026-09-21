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
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
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

// URL Normalization Middleware for Vercel Serverless Function & Reverse Proxies
app.use((req: Request, _res: Response, next: NextFunction) => {
  // If Vercel rewrote request to a function endpoint, x-matched-path contains original client path
  const matchedPath = req.headers['x-matched-path'] as string | undefined;
  if (matchedPath && matchedPath !== '/' && matchedPath !== '/api' && !matchedPath.endsWith('.js')) {
    if (req.url === '/' || req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api?')) {
      const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = matchedPath + queryString;
    }
  }
  next();
});

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
app.get(['/', '/api', '/api/'], rootHandler);

// 2. Real Health Check Endpoint: GET /api/health
// Returns ok/degraded, backend service status, and connected/disconnected database status
const healthHandler = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDb();
    } catch (err: any) {
      console.warn('[HEALTH] Database connection check notice:', err?.message || err);
    }
  }

  const isDbReady = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: isDbReady ? 'ok' : 'degraded',
    service: 'backend',
    database: isDbReady ? 'connected' : 'disconnected',
    platform: 'Civics Plus - Tamil Nadu Civic Complaints',
    readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
};

app.get(['/api/health', '/health', '/api/healthz', '/healthz'], healthHandler);

// Rate Limiting on API routes
app.use('/api', globalRateLimiter);

// Database readiness middleware: operational API endpoints require active DB connection
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Health checks bypass database readiness check
  if (
    req.path === '/api/health' ||
    req.path === '/health' ||
    req.path === '/' ||
    req.path === '/api' ||
    req.path === '/api/' ||
    req.path === '/healthz' ||
    req.path === '/api/healthz'
  ) {
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

// Mount Routes (with and without /api prefix for maximum deployment flexibility)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/complaints', '/complaints'], complaintRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/employees', '/employees'], employeeRoutes);
app.use(['/api/analytics', '/analytics'], analyticsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    errorCategory: 'ENDPOINT_NOT_FOUND',
    message: 'The requested API endpoint was not found on this server.',
    path: req.path,
    url: req.url,
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
