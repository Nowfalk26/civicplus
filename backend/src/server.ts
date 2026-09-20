import app from './app';
import { validateConfig } from './lib/config';
import { connectDb } from './lib/db';
import { User } from './models/User';
import { Complaint } from './models/Complaint';
import { Employee } from './models/Employee';

// Unhandled process errors protection (never crash backend silently)
process.on('uncaughtException', (err: Error) => {
  console.error('[SERVER] Uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[SERVER] Unhandled promise rejection:', reason?.message || reason);
});

export async function startServer() {
  console.log('[SERVER] Starting backend...');

  // 1. Validate environment configuration
  let config;
  try {
    config = validateConfig();
    console.log('[CONFIG] Environment validated');
  } catch (err: any) {
    console.error('[CONFIG] Startup aborted:', err.message);
    process.exit(1);
  }

  const PORT = config.port;

  // 2. Connect to MongoDB before accepting traffic
  console.log('[MONGO] Connecting...');
  try {
    await connectDb();
    console.log('[MONGO] Connected');
  } catch (err: any) {
    console.error(`[MONGO] Connection failed: ${err.message}`);
    console.warn('[SERVER] Warning: Starting server with degraded database connectivity.');
  }

  // 3. Start HTTP server
  const server = app.listen(PORT, async () => {
    console.log(`[SERVER] Listening on configured port ${PORT}`);
    console.log(`[SERVER] Health endpoint available: http://localhost:${PORT}/api/health`);

    try {
      const userCount = await User.countDocuments().catch(() => 0);
      const complaintCount = await Complaint.countDocuments().catch(() => 0);
      const employeeCount = await Employee.countDocuments().catch(() => 0);
      console.log(`[SERVER] Database status: ${userCount} users, ${employeeCount} employees, ${complaintCount} reports.`);
    } catch {}
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[SERVER] Fatal Error: Port ${PORT} is already in use by another process.`);
      console.error(`[SERVER] Please free port ${PORT} or configure PORT in backend/.env`);
      process.exit(1);
    } else {
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

export default app;
module.exports = app;
module.exports.default = app;
