import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Employee } from '../models/Employee';
import { User } from '../models/User';
import { Complaint } from '../models/Complaint';
import { ReportVerification } from '../models/ReportVerification';
import { ComplaintEvidence } from '../models/ComplaintEvidence';
import { ComplaintEvent } from '../models/ComplaintEvent';
import { getNextAccountNumber, getNextEmployeeNumber } from '../models/Counter';
import { connectDb } from '../lib/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateDistance } from '../utils/calculateDistance';
import { uploadToCloudinary } from '../middleware/upload';

const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required (at least 2 characters)'),
  email: z.string().trim().toLowerCase().email('Valid official email required (e.g. user@gmail.com)'),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s\-\(\)]/g, ''))
    .refine(
      (v) => /^(\+?91)?[6-9]\d{9}$/.test(v),
      'Valid 10-digit Indian phone number required (e.g. +91 9876543210 or 9876543210)'
    )
    .transform((v) => (v.startsWith('+91') ? v : v.startsWith('91') && v.length === 12 ? `+${v}` : `+91${v.slice(-10)}`)),
  department: z.string().trim().min(2, 'Department is required'),
  designation: z.string().trim().min(2, 'Designation is required'),
  assignedZone: z.string().trim().min(2, 'Assigned area/zone is required'),
  address: z.string().optional(),
  profilePhoto: z.string().optional(),
  joiningDate: z.string().optional(),
  notes: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
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
        const errorMsg = validation.error.errors.map((e) => e.message).join('. ');
        res.status(400).json({
          success: false,
          message: errorMsg,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const {
        fullName,
        email,
        phone,
        department,
        designation,
        assignedZone,
        address,
        profilePhoto,
        joiningDate,
        notes,
        password,
      } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Verify email/phone not already in use across User and Employee
      const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { phone }],
      });
      const existingEmployee = await Employee.findOne({
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
      const employeeId = await getNextEmployeeNumber();
      const accountNumber = await getNextAccountNumber();
      const effectivePassword = password && password.trim().length >= 6 ? password.trim() : `TNStaff@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(effectivePassword, 10);
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
    } catch (error: any) {
      console.error('Error creating employee:', error);
      res.status(500).json({ success: false, message: 'Failed to create employee.' });
    }
  },

  // PUT /api/employees/:id (Officer / Admin - Edit employee details)
  update: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;
      const { fullName, phone, department, designation, assignedZone, address, profilePhoto, notes } = req.body;

      const employee = await Employee.findById(id);
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee record not found.' });
        return;
      }

      if (fullName) employee.fullName = fullName.trim();
      if (phone) employee.phone = phone.trim();
      if (department) employee.department = department.trim();
      if (designation) employee.designation = designation.trim();
      if (assignedZone) employee.assignedZone = assignedZone.trim();
      if (address !== undefined) employee.address = address.trim();
      if (profilePhoto) employee.profilePhoto = profilePhoto.trim();
      if (notes !== undefined) employee.notes = notes.trim();

      await employee.save();

      // Update linked user
      await User.findByIdAndUpdate(employee.userId, {
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
    } catch (error: any) {
      console.error('Error updating employee:', error);
      res.status(500).json({ success: false, message: 'Failed to update employee.' });
    }
  },

  // POST /api/employees/:id/reset-password (Officer / Admin)
  resetPassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;
      const { newPassword } = req.body;

      const employee = await Employee.findById(id);
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee record not found.' });
        return;
      }

      const generatedPassword = newPassword && newPassword.trim().length >= 6
        ? newPassword.trim()
        : `TNStaff@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      await User.findByIdAndUpdate(employee.userId, {
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
    } catch (error: any) {
      console.error('Error resetting employee password:', error);
      res.status(500).json({ success: false, message: 'Failed to reset employee password.' });
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

  // GET /api/employees/my-reports (Strict Backend Partitioning: Employee only sees their own assigned reports, with Admin/Officer oversight)
  getMyReports: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || !['EMPLOYEE', 'ADMIN', 'OFFICER'].includes(req.user.role)) {
        res.status(403).json({ success: false, message: 'Access strictly for authenticated field employees or administrators.' });
        return;
      }

      const isAdminOrOfficer = req.user.role === 'ADMIN' || req.user.role === 'OFFICER';
      let employee = await Employee.findOne({ userId: req.user.id });

      if (!employee && isAdminOrOfficer) {
        // Fallback for Admin preview: link to first active employee
        employee = await Employee.findOne().sort({ createdAt: -1 });
      }

      if (!employee && !isAdminOrOfficer) {
        res.status(404).json({ success: false, message: 'Employee profile not found.' });
        return;
      }

      const { status, verificationStatus } = req.query;
      const filter: any = {};
      if (employee && !isAdminOrOfficer) {
        filter.assignedEmployeeId = employee._id;
      } else if (employee && isAdminOrOfficer) {
        const hasAssigned = await Complaint.countDocuments({ assignedEmployeeId: employee._id });
        if (hasAssigned > 0) {
          filter.assignedEmployeeId = employee._id;
        }
      }

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
        employee: employee ? {
          id: employee._id.toString(),
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          assignedZone: employee.assignedZone,
        } : {
          id: req.user.id,
          employeeId: 'ADMIN-TN',
          fullName: req.user.name || 'TN Control Administrator',
          assignedZone: 'Tamil Nadu Central',
        },
      });
    } catch (error: any) {
      console.error('Error fetching employee reports:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve assigned reports.' });
    }
  },

  // POST /api/employees/my-reports/:id/verify (Employee Report Verification & Progress Sign-off)
  verifyAssignedReport: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || !['EMPLOYEE', 'ADMIN', 'OFFICER'].includes(req.user.role)) {
        res.status(403).json({ success: false, message: 'Only assigned employees or administrators can verify this report.' });
        return;
      }

      const { id } = req.params;
      const {
        verificationResult,
        verificationNotes,
        progressStatus,
        evidenceSummary,
        photoUrl,
        latitude,
        longitude,
        capturedAt,
        watermarkText,
      } = req.body;

      if (!['GENUINE', 'FAKE', 'NEEDS_REVIEW'].includes(verificationResult)) {
        res.status(400).json({
          success: false,
          message: 'Verification result must be GENUINE, FAKE, or NEEDS_REVIEW.',
        });
        return;
      }

      // Check mandatory photo for field work statuses
      const isProgressWork = progressStatus === 'IN_PROGRESS' || progressStatus === 'WORK_IN_PROGRESS';
      const isCompletedWork = progressStatus === 'RESOLVED' || progressStatus === 'COMPLETED';

      let finalPhotoUrl = photoUrl && typeof photoUrl === 'string' && photoUrl.trim().length > 0
        ? photoUrl.trim()
        : null;

      const file = req.file as Express.Multer.File | undefined;
      if (file && file.buffer) {
        finalPhotoUrl = await uploadToCloudinary(file.buffer);
      }

      if (isProgressWork && !finalPhotoUrl) {
        res.status(400).json({
          success: false,
          message: 'Please capture a work progress photo using the camera.',
        });
        return;
      }

      if (isCompletedWork && !finalPhotoUrl) {
        res.status(400).json({
          success: false,
          message: 'Please capture a completion photo using the camera before closing this complaint.',
        });
        return;
      }

      const isAdminOrOfficer = req.user.role === 'ADMIN' || req.user.role === 'OFFICER';
      let employee = await Employee.findOne({ userId: req.user.id });
      if (!employee && isAdminOrOfficer) {
        employee = await Employee.findOne().sort({ createdAt: -1 });
      }

      if (!employee && !isAdminOrOfficer) {
        res.status(404).json({ success: false, message: 'Employee profile not found.' });
        return;
      }

      // Security check: Employee can only verify complaints assigned to THEM (Admin/Officer can verify for oversight)
      const complaintQuery: any = { _id: id };
      if (!isAdminOrOfficer && employee) {
        complaintQuery.assignedEmployeeId = employee._id;
      }

      const complaint = await Complaint.findOne(complaintQuery);

      if (!complaint) {
        res.status(403).json({
          success: false,
          message: 'You do not have active assignment authority for this report.',
        });
        return;
      }

      // Proximity / Location calculation
      const numLat = latitude !== undefined && latitude !== null ? Number(latitude) : null;
      const numLon = longitude !== undefined && longitude !== null ? Number(longitude) : null;
      let distKm: number | null = null;
      let isLocationVerified = true;

      if (numLat !== null && numLon !== null && !isNaN(numLat) && !isNaN(numLon) && complaint.latitude && complaint.longitude) {
        distKm = Number(calculateDistance(numLat, numLon, complaint.latitude, complaint.longitude).toFixed(3));
        const geofenceRadius = Number(process.env.GEOFENCE_RADIUS_KM) || 0.5;
        isLocationVerified = distKm <= geofenceRadius;
      }

      const captureDate = capturedAt ? new Date(capturedAt) : new Date();
      const staffName = employee ? `${employee.fullName} (${employee.employeeId})` : `${req.user.name || 'Administrator'} (HQ)`;

      // 1. Update Complaint Verification
      complaint.verificationStatus = verificationResult;
      complaint.verifiedByUserId = req.user.id;
      complaint.verifiedByEmployeeId = employee?._id;
      complaint.verifiedByName = staffName;
      complaint.verifiedAt = new Date();
      complaint.verificationNotes = verificationNotes || `Report verified as ${verificationResult}`;

      // Handle status update and timers
      const effectiveStatus = isCompletedWork ? 'RESOLVED' : isProgressWork ? 'IN_PROGRESS' : progressStatus;
      if (effectiveStatus && ['IN_PROGRESS', 'WORK_IN_PROGRESS', 'RESOLVED', 'ASSIGNED'].includes(effectiveStatus)) {
        complaint.status = effectiveStatus;
        if (isProgressWork && !complaint.workStartedAt) {
          complaint.workStartedAt = new Date();
          complaint.workStartedBy = employee?._id;
          complaint.workStartedNotes = verificationNotes || 'Work started on site';
        }
        if (isCompletedWork) {
          complaint.completedAt = new Date();
          complaint.completedBy = employee?._id;
          complaint.completionNotes = verificationNotes || 'Work completed on site';
          complaint.resolvedAt = new Date();
          if (complaint.workStartedAt) {
            complaint.workDuration = complaint.completedAt.getTime() - new Date(complaint.workStartedAt).getTime();
          }
        }
      }

      // 2. Create ComplaintEvidence and append to complaint.photos if photo is present
      let createdEvidence: any = null;
      if (finalPhotoUrl) {
        const evidenceType = isCompletedWork ? 'WORK_COMPLETED' : 'WORK_IN_PROGRESS';

        createdEvidence = await ComplaintEvidence.create({
          complaintId: complaint._id,
          type: evidenceType,
          fileUrl: finalPhotoUrl,
          uploadedBy: req.user.id,
          uploadedByName: staffName,
          uploadedAt: new Date(),
          description: verificationNotes?.trim() || `${evidenceType} evidence`,
          latitude: numLat,
          longitude: numLon,
          capturedAt: captureDate,
          distanceFromSiteKm: distKm,
          isLocationVerified,
          watermarkText: watermarkText || null,
        });

        complaint.photos.push({
          url: finalPhotoUrl,
          type: evidenceType as any,
          uploadedAt: new Date(),
          uploadedBy: staffName,
          description: verificationNotes?.trim() || `${evidenceType} evidence`,
          latitude: numLat,
          longitude: numLon,
          capturedAt: captureDate,
          distanceFromSiteKm: distKm,
          isLocationVerified,
        });
      }

      const locationTag = numLat && numLon
        ? ` • GPS: ${numLat.toFixed(4)}° N, ${numLon.toFixed(4)}° E (${isLocationVerified ? 'Location Confirmed' : `${Math.round((distKm || 0) * 1000)}m from site`})`
        : '';

      const timelineStage = isCompletedWork
        ? 'WORK_COMPLETED'
        : isProgressWork
        ? 'WORK_IN_PROGRESS'
        : `VERIFIED_${verificationResult}`;

      complaint.timeline.push({
        stage: timelineStage,
        timestamp: new Date(),
        officerName: staffName,
        notes: `${verificationNotes || `Field inspection completed: ${verificationResult}`}${locationTag}`,
        actorId: req.user.id,
        evidenceId: createdEvidence?._id?.toString() || undefined,
      });

      await complaint.save();

      // 3. Create persistent ReportVerification log
      await ReportVerification.create({
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        verifiedByUserId: req.user.id,
        verifiedByEmployeeId: employee?._id,
        verifiedByName: staffName,
        verificationResult,
        verificationNotes: verificationNotes || `Report marked ${verificationResult}`,
        evidenceSummary: evidenceSummary || null,
        verifiedAt: new Date(),
      });

      // 4. Create ComplaintEvent audit trail
      if (isProgressWork || isCompletedWork) {
        await ComplaintEvent.create({
          complaintId: complaint._id,
          eventType: isCompletedWork ? 'WORK_COMPLETED' : 'WORK_STARTED',
          actorId: req.user.id,
          actorRole: req.user.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
          actorName: staffName,
          timestamp: new Date(),
          description: `${isCompletedWork ? 'Work completed' : 'Work in progress'} sign-off submitted. ${verificationNotes?.trim() || ''}${locationTag}`,
          evidenceId: createdEvidence?._id,
          metadata: {
            latitude: numLat,
            longitude: numLon,
            capturedAt: captureDate.toISOString(),
            distanceFromSiteKm: distKm,
            isLocationVerified,
            verificationResult,
            progressStatus: complaint.status,
          },
        }).catch((e: any) => console.error('Audit event creation error:', e));
      }

      console.log(`[REPORT-VERIFIED] Complaint ${complaint.complaintId} verified as ${verificationResult} by ${staffName} (Status: ${complaint.status}, Evidence: ${createdEvidence?._id || 'none'})`);

      res.json({
        success: true,
        message: `Report marked as ${verificationResult}. Verification and work evidence saved permanently.`,
        complaint: complaint.toJSON(),
      });
    } catch (error: any) {
      console.error('verifyAssignedReport error:', error);
      res.status(500).json({ success: false, message: 'Failed to record report verification.' });
    }
  },
};
