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
}));
// CORS configuration: Allow all Vercel domains, localhost, and custom frontend domains
app.use((0, cors_1.default)({
    origin: (_origin, callback) => {
        // Allow any requesting origin for seamless deployment across Vercel, localhost, and custom domains
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
// Explicit OPTIONS pre-flight handler
app.options('*', (0, cors_1.default)());
// Request parsing
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
app.use((0, cookie_parser_1.default)());
// Database readiness middleware: guarantees MongoDB is connected before route handlers execute
app.use(async (_req, _res, next) => {
    try {
        await (0, db_1.connectDb)();
        next();
    }
    catch (err) {
        next(err);
    }
});
// Global Rate Limiting
app.use('/api', rateLimit_1.globalRateLimiter);
// Root Status Endpoint
const rootHandler = (_req, res) => {
    res.json({
        status: 'online',
        platform: 'Civics Plus Tamil Nadu Backend API',
        database: 'MongoDB (Single Persistent Source of Truth)',
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
// System Health Check (Available at both /health and /api/health)
const healthHandler = (_req, res) => {
    res.json({
        status: 'healthy',
        platform: 'Civics Plus - Tamil Nadu Civic Complaints',
        database: 'MongoDB Persistent Storage',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        region: 'Tamil Nadu, India',
    });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
// Mount Routes (Mount both with /api prefix and without for maximum deployment compatibility)
app.use('/api/auth', auth_1.default);
app.use('/auth', auth_1.default);
app.use('/api/complaints', complaint_1.default);
app.use('/complaints', complaint_1.default);
app.use('/api/users', user_1.default);
app.use('/users', user_1.default);
app.use('/api/employees', employee_1.default);
app.use('/employees', employee_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/analytics', analytics_1.default);
// 404 Handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'The requested API endpoint was not found.',
    });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error occurred.',
    });
});
exports.default = app;
