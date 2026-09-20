import app from './app';
import { connectDb } from './lib/db';
import { User } from './models/User';
import { Complaint } from './models/Complaint';
import { Employee } from './models/Employee';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectDb();
    console.log('✔ MongoDB connection primed and validated.');
  } catch (error: any) {
    console.error('CRITICAL: Could not establish MongoDB connection:', error);
  }

  app.listen(PORT, async () => {
    let userCount = 0;
    let complaintCount = 0;
    let employeeCount = 0;
    try {
      userCount = await User.countDocuments();
      complaintCount = await Complaint.countDocuments();
      employeeCount = await Employee.countDocuments();
    } catch {}

    console.log(`
=====================================================
  🏛️  CIVICS PLUS - TAMIL NADU CIVIC AUTHORITY
=====================================================
  🚀 Server running on: http://localhost:${PORT}
  📡 API Health:        http://localhost:${PORT}/api/health
  🍃 Database Engine:   MongoDB (Permanent Source of Truth)
  👥 Registered Users:  ${userCount} accounts
  👔 Field Employees:   ${employeeCount} staff
  📋 Active Complaints: ${complaintCount} tickets
  🛡️  Presence Engine:  Real-time ONLINE / OFFLINE tracking
=====================================================
    `);
  });
}

startServer();
