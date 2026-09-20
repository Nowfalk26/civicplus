"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const Employee_1 = require("../models/Employee");
const User_1 = require("../models/User");
const Complaint_1 = require("../models/Complaint");
const ReportVerification_1 = require("../models/ReportVerification");
const Counter_1 = require("../models/Counter");
const db_1 = require("../lib/db");
const createEmployeeSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, 'Full name is required'),
    email: zod_1.z.string().email('Valid official email required'),
    phone: zod_1.z.string().regex(/^\+?91?[6-9]\d{9}$/, 'Valid 10-digit Indian phone number required'),
    department: zod_1.z.string().min(2, 'Department is required'),
    designation: zod_1.z.string().min(2, 'Designation is required'),
    assignedZone: zod_1.z.string().min(2, 'Assigned area/zone is required'),
    address: zod_1.z.string().optional(),
    profilePhoto: zod_1.z.string().optional(),
    joiningDate: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters').optional(),
});
exports.employeeController = {
    // GET /api/employees (Officer / Admin)
    getAll: async (_req, res) => {
        try {
            await (0, db_1.connectDb)();
            const employees = await Employee_1.Employee.find().sort({ createdAt: -1 }).lean();
            // Enrich with linked user presence and real-time MongoDB counts
            const enriched = await Promise.all(employees.map(async (emp) => {
                const user = await User_1.User.findById(emp.userId).lean();
                const [assignedCount, completedCount, inProgressCount, pendingVerificationCount] = await Promise.all([
                    Complaint_1.Complaint.countDocuments({ assignedEmployeeId: emp._id }),
                    Complaint_1.Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'RESOLVED' }),
                    Complaint_1.Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'IN_PROGRESS' }),
                    Complaint_1.Complaint.countDocuments({
                        assignedEmployeeId: emp._id,
                        verificationStatus: 'PENDING_VERIFICATION',
                    }),
                ]);
                return {
                    ...emp,
                    id: emp._id.toString(),
                    presenceStatus: user?.presenceStatus || (user?.isOnline ? 'ONLINE' : 'OFFLINE'),
                    isOnline: Boolean(user?.isOnline),
                    lastActive: user?.lastSeenAt || user?.lastLoginAt || emp.updatedAt,
                    assignedReportsCount: assignedCount,
                    completedReportsCount: completedCount,
                    inProgressReportsCount: inProgressCount,
                    pendingVerificationCount,
                };
            }));
            res.json({
                success: true,
                count: enriched.length,
                employees: enriched,
            });
        }
        catch (error) {
            console.error('Error fetching employees:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve employees.' });
        }
    },
    // POST /api/employees (Officer / Admin)
    create: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const validation = createEmployeeSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    errors: validation.error.errors.map((e) => e.message),
                });
                return;
            }
            const { fullName, email, phone, department, designation, assignedZone, address, profilePhoto, joiningDate, notes, password, } = validation.data;
            const normalizedEmail = email.toLowerCase().trim();
            // Verify email/phone not already in use across User and Employee
            const existingUser = await User_1.User.findOne({
                $or: [{ email: normalizedEmail }, { phone }],
            });
            const existingEmployee = await Employee_1.Employee.findOne({
                $or: [{ email: normalizedEmail }, { phone }],
            });
            if (existingUser || existingEmployee) {
                res.status(400).json({
                    success: false,
                    message: 'An account with this official email or phone number already exists.',
                });
                return;
            }
            // Generate credentials
            const employeeId = await (0, Counter_1.getNextEmployeeNumber)();
            const accountNumber = await (0, Counter_1.getNextAccountNumber)();
            const effectivePassword = password && password.trim().length >= 6 ? password.trim() : `TNStaff@${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedPassword = await bcryptjs_1.default.hash(effectivePassword, 10);
            const username = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 12)}_${Math.floor(100 + Math.random() * 900)}`;
            // 1. Create linked User authentication identity
            const newUser = await User_1.User.create({
                accountNumber,
                username,
                name: fullName,
                email: normalizedEmail,
                phone,
                password: hashedPassword,
                role: 'EMPLOYEE',
                department,
                designation,
                location: assignedZone,
                approvalStatus: 'APPROVED',
                isApproved: true,
                accountStatus: 'ACTIVE',
                presenceStatus: 'OFFLINE',
                isOnline: false,
                needsPasswordChange: true,
            });
            // 2. Create Employee profile
            const newEmployee = await Employee_1.Employee.create({
                employeeId,
                userId: newUser._id,
                fullName,
                email: normalizedEmail,
                phone,
                department,
                designation,
                assignedZone,
                address: address || '',
                profilePhoto: profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
                notes: notes || '',
                mustChangePassword: true,
                createdBy: req.user?.id || null,
                accountStatus: 'ACTIVE',
            });
            console.log(`[EMPLOYEE-CREATED] ${fullName} (${employeeId}) created successfully in MongoDB Atlas.`);
            res.status(201).json({
                success: true,
                message: `Employee ${fullName} created successfully. Credentials active.`,
                employee: {
                    ...newEmployee.toJSON(),
                    tempPassword: effectivePassword,
                },
            });
        }
        catch (error) {
            console.error('Error creating employee:', error);
            res.status(500).json({ success: false, message: 'Failed to create employee.' });
        }
    },
    // PUT /api/employees/:id (Officer / Admin - Edit employee details)
    update: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { fullName, phone, department, designation, assignedZone, address, profilePhoto, notes } = req.body;
            const employee = await Employee_1.Employee.findById(id);
            if (!employee) {
                res.status(404).json({ success: false, message: 'Employee record not found.' });
                return;
            }
            if (fullName)
                employee.fullName = fullName.trim();
            if (phone)
                employee.phone = phone.trim();
            if (department)
                employee.department = department.trim();
            if (designation)
                employee.designation = designation.trim();
            if (assignedZone)
                employee.assignedZone = assignedZone.trim();
            if (address !== undefined)
                employee.address = address.trim();
            if (profilePhoto)
                employee.profilePhoto = profilePhoto.trim();
            if (notes !== undefined)
                employee.notes = notes.trim();
            await employee.save();
            // Update linked user
            await User_1.User.findByIdAndUpdate(employee.userId, {
                ...(fullName ? { name: fullName.trim() } : {}),
                ...(phone ? { phone: phone.trim() } : {}),
                ...(department ? { department: department.trim() } : {}),
                ...(designation ? { designation: designation.trim() } : {}),
                ...(assignedZone ? { location: assignedZone.trim() } : {}),
            });
            res.json({
                success: true,
                message: 'Employee details updated successfully.',
                employee: employee.toJSON(),
            });
        }
        catch (error) {
            console.error('Error updating employee:', error);
            res.status(500).json({ success: false, message: 'Failed to update employee.' });
        }
    },
    // POST /api/employees/:id/reset-password (Officer / Admin)
    resetPassword: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { newPassword } = req.body;
            const employee = await Employee_1.Employee.findById(id);
            if (!employee) {
                res.status(404).json({ success: false, message: 'Employee record not found.' });
                return;
            }
            const generatedPassword = newPassword && newPassword.trim().length >= 6
                ? newPassword.trim()
                : `TNStaff@${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedPassword = await bcryptjs_1.default.hash(generatedPassword, 10);
            await User_1.User.findByIdAndUpdate(employee.userId, {
                password: hashedPassword,
                needsPasswordChange: true,
            });
            employee.mustChangePassword = true;
            await employee.save();
            res.json({
                success: true,
                message: `Password reset successfully for ${employee.fullName}.`,
                tempPassword: generatedPassword,
            });
        }
        catch (error) {
            console.error('Error resetting employee password:', error);
            res.status(500).json({ success: false, message: 'Failed to reset employee password.' });
        }
    },
    // PUT /api/employees/:id/status (Officer / Admin)
    toggleStatus: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { status } = req.body;
            if (!['ACTIVE', 'DISABLED'].includes(status)) {
                res.status(400).json({ success: false, message: 'Status must be ACTIVE or DISABLED.' });
                return;
            }
            const employee = await Employee_1.Employee.findById(id);
            if (!employee) {
                res.status(404).json({ success: false, message: 'Employee not found.' });
                return;
            }
            employee.accountStatus = status;
            await employee.save();
            // Sync linked user accountStatus
            await User_1.User.findByIdAndUpdate(employee.userId, {
                accountStatus: status,
            });
            res.json({
                success: true,
                message: `Employee account status updated to ${status}.`,
                employee: employee.toJSON(),
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error updating employee status.' });
        }
    },
    // GET /api/employees/workload (Officer / Admin)
    getWorkload: async (_req, res) => {
        try {
            await (0, db_1.connectDb)();
            const employees = await Employee_1.Employee.find().sort({ fullName: 1 }).lean();
            const workload = await Promise.all(employees.map(async (emp) => {
                const [assigned, inProgress, completed, pendingVerification] = await Promise.all([
                    Complaint_1.Complaint.countDocuments({ assignedEmployeeId: emp._id }),
                    Complaint_1.Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'IN_PROGRESS' }),
                    Complaint_1.Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'RESOLVED' }),
                    Complaint_1.Complaint.countDocuments({
                        assignedEmployeeId: emp._id,
                        verificationStatus: 'PENDING_VERIFICATION',
                    }),
                ]);
                return {
                    id: emp._id.toString(),
                    employeeId: emp.employeeId,
                    fullName: emp.fullName,
                    department: emp.department,
                    designation: emp.designation,
                    assignedZone: emp.assignedZone,
                    assigned,
                    inProgress,
                    completed,
                    pendingVerification,
                };
            }));
            res.json({
                success: true,
                workload,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to generate workload analytics.' });
        }
    },
    // GET /api/employees/my-reports (Strict Backend Partitioning: Employee only sees their own assigned reports)
    getMyReports: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            if (!req.user || req.user.role !== 'EMPLOYEE') {
                res.status(403).json({ success: false, message: 'Access strictly for authenticated field employees.' });
                return;
            }
            const employee = await Employee_1.Employee.findOne({ userId: req.user.id });
            if (!employee) {
                res.status(404).json({ success: false, message: 'Employee profile not found.' });
                return;
            }
            const { status, verificationStatus } = req.query;
            const filter = { assignedEmployeeId: employee._id };
            if (status && status !== 'ALL') {
                filter.status = status;
            }
            if (verificationStatus && verificationStatus !== 'ALL') {
                filter.verificationStatus = verificationStatus;
            }
            const reports = await Complaint_1.Complaint.find(filter)
                .sort({ assignedAt: -1, createdAt: -1 })
                .populate('reportedById', 'name username phone location')
                .lean();
            res.json({
                success: true,
                count: reports.length,
                reports: reports.map((r) => ({
                    ...r,
                    id: r._id.toString(),
                })),
                employee: {
                    id: employee._id.toString(),
                    employeeId: employee.employeeId,
                    fullName: employee.fullName,
                    assignedZone: employee.assignedZone,
                },
            });
        }
        catch (error) {
            console.error('Error fetching employee reports:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve assigned reports.' });
        }
    },
    // POST /api/employees/my-reports/:id/verify (Employee Report Verification)
    verifyAssignedReport: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            if (!req.user || req.user.role !== 'EMPLOYEE') {
                res.status(403).json({ success: false, message: 'Only assigned employees can verify this report.' });
                return;
            }
            const { id } = req.params;
            const { verificationResult, verificationNotes, progressStatus, evidenceSummary } = req.body;
            if (!['GENUINE', 'FAKE', 'NEEDS_REVIEW'].includes(verificationResult)) {
                res.status(400).json({
                    success: false,
                    message: 'Verification result must be GENUINE, FAKE, or NEEDS_REVIEW.',
                });
                return;
            }
            const employee = await Employee_1.Employee.findOne({ userId: req.user.id });
            if (!employee) {
                res.status(404).json({ success: false, message: 'Employee profile not found.' });
                return;
            }
            // Security check: Employee can only verify complaints assigned to THEM
            const complaint = await Complaint_1.Complaint.findOne({
                _id: id,
                assignedEmployeeId: employee._id,
            });
            if (!complaint) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have active assignment authority for this report.',
                });
                return;
            }
            // 1. Update Complaint Verification
            complaint.verificationStatus = verificationResult;
            complaint.verifiedByUserId = req.user.id;
            complaint.verifiedByEmployeeId = employee._id;
            complaint.verifiedByName = `${employee.fullName} (${employee.employeeId})`;
            complaint.verifiedAt = new Date();
            complaint.verificationNotes = verificationNotes || `Report verified as ${verificationResult}`;
            if (progressStatus && ['IN_PROGRESS', 'RESOLVED'].includes(progressStatus)) {
                complaint.status = progressStatus;
                if (progressStatus === 'RESOLVED') {
                    complaint.resolvedAt = new Date();
                }
            }
            complaint.timeline.push({
                stage: `VERIFIED_${verificationResult}`,
                timestamp: new Date(),
                officerName: `${employee.fullName} (${employee.employeeId})`,
                notes: verificationNotes || `Field inspection completed: ${verificationResult}`,
            });
            await complaint.save();
            // 2. Create persistent ReportVerification log
            await ReportVerification_1.ReportVerification.create({
                complaintId: complaint._id,
                complaintCode: complaint.complaintId,
                verifiedByUserId: req.user.id,
                verifiedByEmployeeId: employee._id,
                verifiedByName: `${employee.fullName} (${employee.employeeId})`,
                verificationResult,
                verificationNotes: verificationNotes || `Report marked ${verificationResult}`,
                evidenceSummary: evidenceSummary || null,
                verifiedAt: new Date(),
            });
            console.log(`[REPORT-VERIFIED] Complaint ${complaint.complaintId} verified as ${verificationResult} by ${employee.fullName}`);
            res.json({
                success: true,
                message: `Report marked as ${verificationResult}. Verification saved permanently in MongoDB.`,
                complaint: complaint.toJSON(),
            });
        }
        catch (error) {
            console.error('verifyAssignedReport error:', error);
            res.status(500).json({ success: false, message: 'Failed to record report verification.' });
        }
    },
};
