import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import complaintRoutes from './routes/complaint';
import userRoutes from './routes/user';
import analyticsRoutes from './routes/analytics';
import { globalRateLimiter } from './middleware/rateLimit';

const app: Express = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS access denied for this origin.'));
      }
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Global Rate Limiting
app.use('/api', globalRateLimiter);

// Root Status Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'Civics Plus Tamil Nadu Backend API',
    message: 'Backend server is active and responding to requests.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      complaints: '/api/complaints',
      analytics: '/api/analytics',
    },
  });
});

// System Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'Civics Plus - Tamil Nadu Civic Complaints',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    region: 'Tamil Nadu, India',
  });
});


// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

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
