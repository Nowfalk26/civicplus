import app from './app';
import { connectDb } from './lib/db';
import { User } from './models/User';
import { Complaint } from './models/Complaint';
import { Employee } from './models/Employee';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, async () => {
  console.log(`
=====================================================
  🏛️  CIVICS PLUS - TAMIL NADU CIVIC AUTHORITY
=====================================================
  🚀 Server running on: http://localhost:${PORT}
  📡 API Health:        http://localhost:${PORT}/api/health
  🍃 Database Engine:   MongoDB (Permanent Source of Truth)
  🛡️  Presence Engine:  Real-time ONLINE / OFFLINE tracking
=====================================================
  `);

  try {
    await connectDb();
    const userCount = await User.countDocuments().catch(() => 0);
    const complaintCount = await Complaint.countDocuments().catch(() => 0);
    const employeeCount = await Employee.countDocuments().catch(() => 0);
    console.log(`✔ Database connected: ${userCount} users, ${employeeCount} employees, ${complaintCount} reports.`);
  } catch (err: any) {
    console.warn('Initial background DB connection attempt:', err.message);
  }
});

export default app;
module.exports = app;
module.exports.default = app;

