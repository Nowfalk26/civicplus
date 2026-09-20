"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./lib/db");
const User_1 = require("./models/User");
const Complaint_1 = require("./models/Complaint");
const Employee_1 = require("./models/Employee");
const PORT = Number(process.env.PORT) || 3000;
async function startServer() {
    try {
        await (0, db_1.connectDb)();
        console.log('✔ MongoDB connection primed and validated.');
    }
    catch (error) {
        console.error('CRITICAL: Could not establish MongoDB connection:', error);
    }
    app_1.default.listen(PORT, async () => {
        let userCount = 0;
        let complaintCount = 0;
        let employeeCount = 0;
        try {
            userCount = await User_1.User.countDocuments();
            complaintCount = await Complaint_1.Complaint.countDocuments();
            employeeCount = await Employee_1.Employee.countDocuments();
        }
        catch { }
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
if (!process.env.VERCEL) {
    startServer();
}
exports.default = app_1.default;
module.exports = app_1.default;
