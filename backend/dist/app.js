"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("./lib/db");
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const complaint_1 = __importDefault(require("./routes/complaint"));
const user_1 = __importDefault(require("./routes/user"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const employee_1 = __importDefault(require("./routes/employee"));
const rateLimit_1 = require("./middleware/rateLimit");
const app = (0, express_1.default)();
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
// CORS configuration: Strictly allow frontend origins with full credentials and preflight support
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://civicplus-red.vercel.app',
    'https://civicplus-backend.vercel.app',
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (curl, mobile, server-to-server)
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) ||
            /\.vercel\.app$/.test(new URL(origin).hostname) ||
            process.env.NODE_ENV !== 'production';
        if (isAllowed) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS origin not allowed: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// Request parsing
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
app.use((0, cookie_parser_1.default)());
// URL Normalization Middleware for Vercel Serverless Function & Reverse Proxies
app.use((req, _res, next) => {
    // If Vercel rewrote request to a function endpoint, x-matched-path contains original client path
    const matchedPath = req.headers['x-matched-path'];
    if (matchedPath && matchedPath !== '/' && matchedPath !== '/api' && !matchedPath.endsWith('.js')) {
        if (req.url === '/' || req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api?')) {
            const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
            req.url = matchedPath + queryString;
        }
    }
    next();
});
// 1. Root Status Endpoint
const rootHandler = (_req, res) => {
    const isDbReady = mongoose_1.default.connection.readyState === 1;
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
const healthHandler = async (_req, res) => {
    if (mongoose_1.default.connection.readyState !== 1) {
        try {
            await (0, db_1.connectDb)();
        }
        catch (err) {
            console.warn('[HEALTH] Database connection check notice:', err?.message || err);
        }
    }
    const isDbReady = mongoose_1.default.connection.readyState === 1;
    res.status(200).json({
        status: isDbReady ? 'ok' : 'degraded',
        service: 'backend',
        database: isDbReady ? 'connected' : 'disconnected',
        platform: 'Civics Plus - Tamil Nadu Civic Complaints',
        readyState: mongoose_1.default.connection.readyState,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
    });
};
app.get(['/api/health', '/health', '/api/healthz', '/healthz'], healthHandler);
// Rate Limiting on API routes
app.use('/api', rateLimit_1.globalRateLimiter);
// Database readiness middleware: operational API endpoints require active DB connection
app.use(async (req, res, next) => {
    // Health checks bypass database readiness check
    if (req.path === '/api/health' ||
        req.path === '/health' ||
        req.path === '/' ||
        req.path === '/api' ||
        req.path === '/api/' ||
        req.path === '/healthz' ||
        req.path === '/api/healthz') {
        return next();
    }
    if (mongoose_1.default.connection.readyState === 1) {
        return next();
    }
    try {
        await (0, db_1.connectDb)();
        next();
    }
    catch (err) {
        console.error('[MONGO] Request blocked by database disconnect:', err.message);
        res.status(503).json({
            success: false,
            errorCategory: 'MONGODB_UNAVAILABLE',
            message: 'Database service is currently unavailable. Please verify database connection and try again.',
        });
    }
});
// Mount Routes (with and without /api prefix for maximum deployment flexibility)
app.use(['/api/auth', '/auth'], auth_1.default);
app.use(['/api/complaints', '/complaints'], complaint_1.default);
app.use(['/api/users', '/users'], user_1.default);
app.use(['/api/employees', '/employees'], employee_1.default);
app.use(['/api/analytics', '/analytics'], analytics_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        errorCategory: 'ENDPOINT_NOT_FOUND',
        message: 'The requested API endpoint was not found on this server.',
        path: req.path,
        url: req.url,
    });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('[SERVER] Unhandled error:', err.message || err);
    res.status(err.status || 500).json({
        success: false,
        errorCategory: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Internal server error occurred.',
    });
});
exports.default = app;
module.exports = app;
module.exports.default = app;
