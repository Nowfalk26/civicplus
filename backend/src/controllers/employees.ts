import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Employee } from '../models/Employee';
import { User } from '../models/User';
import { Complaint } from '../models/Complaint';
import { ReportVerification } from '../models/ReportVerification';
import { getNextAccountNumber, getNextEmployeeNumber } from '../models/Counter';
import { connectDb } from '../lib/db';
import { AuthenticatedRequest } from '../middleware/auth';

const createEmployeeSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid official email required'),
  phone: z.string().regex(/^\+?91?[6-9]\d{9}$/, 'Valid 10-digit Indian phone number required'),
  department: z.string().min(2, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  assignedZone: z.string().min(2, 'Assigned area/zone is required'),
});

export const employeeController = {
  // GET /api/employees (Officer / Admin)
  getAll: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const employees = await Employee.find().sort({ createdAt: -1 }).lean();

      // Enrich with linked user presence and real-time MongoDB counts
      const enriched = await Promise.all(
        employees.map(async (emp) => {
          const user = await User.findById(emp.userId).lean();
          const [assignedCount, completedCount, inProgressCount, pendingVerificationCount] =
            await Promise.all([
              Complaint.countDocuments({ assignedEmployeeId: emp._id }),
              Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'RESOLVED' }),
              Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'IN_PROGRESS' }),
              Complaint.countDocuments({
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
        })
      );

      res.json({
        success: true,
        count: enriched.length,
        employees: enriched,
      });
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve employees.' });
    }
  },

  // POST /api/employees (Officer / Admin)
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const validation = createEmployeeSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { fullName, email, phone, department, designation, assignedZone } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Verify email/phone not already in use
      const existing = await User.findOne({
        $or: [{ email: normalizedEmail }, { phone }],
      });

      if (existing) {
        res.status(400).json({
          success: false,
          message: 'An account with this official email or phone number already exists.',
        });
        return;
      }

      // Generate credentials
      const employeeId = await getNextEmployeeNumber();
      const accountNumber = await getNextAccountNumber();
      const tempPassword = `TNStaff@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const username = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 12)}_${Math.floor(100 + Math.random() * 900)}`;

      // 1. Create linked User authentication identity
      const newUser = await User.create({
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
      const newEmployee = await Employee.create({
        employeeId,
        userId: newUser._id,
        fullName,
        email: normalizedEmail,
        phone,
        department,
        designation,
        assignedZone,
        accountStatus: 'ACTIVE',
      });

      console.log(`[EMPLOYEE-CREATED] ${fullName} (${employeeId}) created successfully in MongoDB.`);

      res.status(201).json({
        success: true,
        message: `Employee ${fullName} created successfully. Login credentials ready.`,
        employee: {
          ...newEmployee.toJSON(),
          tempPassword,
        },
      });
    } catch (error: any) {
      console.error('Error creating employee:', error);
      res.status(500).json({ success: false, message: 'Failed to create employee.' });
    }
  },

  // PUT /api/employees/:id/status (Officer / Admin)
  toggleStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;
      const { status } = req.body;

      if (!['ACTIVE', 'DISABLED'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be ACTIVE or DISABLED.' });
        return;
      }

      const employee = await Employee.findById(id);
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found.' });
        return;
      }

      employee.accountStatus = status;
      await employee.save();

      // Sync linked user accountStatus
      await User.findByIdAndUpdate(employee.userId, {
        accountStatus: status,
      });

      res.json({
        success: true,
        message: `Employee account status updated to ${status}.`,
        employee: employee.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating employee status.' });
    }
  },

  // GET /api/employees/workload (Officer / Admin)
  getWorkload: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const employees = await Employee.find().sort({ fullName: 1 }).lean();

      const workload = await Promise.all(
        employees.map(async (emp) => {
          const [assigned, inProgress, completed, pendingVerification] = await Promise.all([
            Complaint.countDocuments({ assignedEmployeeId: emp._id }),
            Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'IN_PROGRESS' }),
            Complaint.countDocuments({ assignedEmployeeId: emp._id, status: 'RESOLVED' }),
            Complaint.countDocuments({
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
        })
      );

      res.json({
        success: true,
        workload,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to generate workload analytics.' });
    }
  },

  // GET /api/employees/my-reports (Strict Backend Partitioning: Employee only sees their own assigned reports)
  getMyReports: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        res.status(403).json({ success: false, message: 'Access strictly for authenticated field employees.' });
        return;
      }

      const employee = await Employee.findOne({ userId: req.user.id });
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee profile not found.' });
        return;
      }

      const { status, verificationStatus } = req.query;
      const filter: any = { assignedEmployeeId: employee._id };

      if (status && status !== 'ALL') {
        filter.status = status;
      }
      if (verificationStatus && verificationStatus !== 'ALL') {
        filter.verificationStatus = verificationStatus;
      }

      const reports = await Complaint.find(filter)
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
    } catch (error: any) {
      console.error('Error fetching employee reports:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve assigned reports.' });
    }
  },

  // POST /api/employees/my-reports/:id/verify (Employee Report Verification)
  verifyAssignedReport: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
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

      const employee = await Employee.findOne({ userId: req.user.id });
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee profile not found.' });
        return;
      }

      // Security check: Employee can only verify complaints assigned to THEM
      const complaint = await Complaint.findOne({
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
      await ReportVerification.create({
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
    } catch (error: any) {
      console.error('verifyAssignedReport error:', error);
      res.status(500).json({ success: false, message: 'Failed to record report verification.' });
    }
  },
};
