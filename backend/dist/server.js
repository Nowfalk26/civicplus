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
if (!process.env.VERCEL) {
    app_1.default.listen(PORT, async () => {
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
            await (0, db_1.connectDb)();
            const userCount = await User_1.User.countDocuments().catch(() => 0);
            const complaintCount = await Complaint_1.Complaint.countDocuments().catch(() => 0);
            const employeeCount = await Employee_1.Employee.countDocuments().catch(() => 0);
            console.log(`✔ Database connected: ${userCount} users, ${employeeCount} employees, ${complaintCount} reports.`);
        }
        catch (err) {
            console.warn('Initial background DB connection attempt:', err.message);
        }
    });
}
exports.default = app_1.default;
module.exports = app_1.default;
module.exports.default = app_1.default;
