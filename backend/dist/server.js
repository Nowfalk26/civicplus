"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const app_1 = __importDefault(require("./app"));
const config_1 = require("./lib/config");
const db_1 = require("./lib/db");
const User_1 = require("./models/User");
const Complaint_1 = require("./models/Complaint");
const Employee_1 = require("./models/Employee");
// Unhandled process errors protection (never crash backend silently)
process.on('uncaughtException', (err) => {
    console.error('[SERVER] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[SERVER] Unhandled promise rejection:', reason?.message || reason);
});
async function startServer() {
    console.log('[SERVER] Starting backend...');
    // 1. Validate environment configuration
    let config;
    try {
        config = (0, config_1.validateConfig)();
        console.log('[CONFIG] Environment validated');
    }
    catch (err) {
        console.error('[CONFIG] Startup aborted:', err.message);
        process.exit(1);
    }
    const PORT = config.port;
    // 2. Connect to MongoDB before accepting traffic
    console.log('[MONGO] Connecting...');
    try {
        await (0, db_1.connectDb)();
        console.log('[MONGO] Connected');
    }
    catch (err) {
        console.error(`[MONGO] Connection failed: ${err.message}`);
        console.warn('[SERVER] Warning: Starting server with degraded database connectivity.');
    }
    // 3. Start HTTP server
    const server = app_1.default.listen(PORT, async () => {
        console.log(`[SERVER] Listening on configured port ${PORT}`);
        console.log(`[SERVER] Health endpoint available: http://localhost:${PORT}/api/health`);
        try {
            const userCount = await User_1.User.countDocuments().catch(() => 0);
            const complaintCount = await Complaint_1.Complaint.countDocuments().catch(() => 0);
            const employeeCount = await Employee_1.Employee.countDocuments().catch(() => 0);
            console.log(`[SERVER] Database status: ${userCount} users, ${employeeCount} employees, ${complaintCount} reports.`);
        }
        catch { }
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[SERVER] Fatal Error: Port ${PORT} is already in use by another process.`);
            console.error(`[SERVER] Please free port ${PORT} or configure PORT in backend/.env`);
            process.exit(1);
        }
        else {
            console.error('[SERVER] Server listen error:', err.message);
            process.exit(1);
        }
    });
    return server;
}
// Auto-start server in standalone Node environment (not in Vercel serverless)
if (!process.env.VERCEL) {
    startServer().catch((err) => {
        console.error('[SERVER] Fatal error during startup:', err);
    });
}
exports.default = app_1.default;
module.exports = app_1.default;
module.exports.default = app_1.default;
