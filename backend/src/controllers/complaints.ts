import { Response } from 'express';
import { z } from 'zod';
import { Complaint, IComplaint } from '../models/Complaint';
import { Employee } from '../models/Employee';
import { User } from '../models/User';
import { AssignmentHistory } from '../models/AssignmentHistory';
import { ReportVerification } from '../models/ReportVerification';
import { ComplaintEvent } from '../models/ComplaintEvent';
import { getResolutionDays, calculateDueDate } from '../models/SlaConfig';
import { connectDb } from '../lib/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateComplaintId } from '../utils/generateId';
import { calculateDistance } from '../utils/calculateDistance';
import { evaluateComplaintFraud } from '../services/fraudDetection';
import { uploadToCloudinary } from '../middleware/upload';
import { smsService } from '../services/sms';
import { emailService } from '../services/email';
import { validateCivicImage } from '../services/imageValidation';

const createComplaintSchema = z
  .object({
    category: z.enum([
      'ROAD_DAMAGE',
      'STREET_LIGHT',
      'ELECTRICAL_WIRE',
      'GARBAGE_WASTE',
      'STORM_WATER_DRAIN',
      'PUBLIC_SPACE',
    ]),
    description: z.string().optional().default(''),
    voiceAudio: z.string().optional(),
    voiceDuration: z.coerce.number().optional().default(0),
    location: z.string().min(3, 'Location is required'),
    district: z.string().optional(),
    latitude: z.coerce.number().min(8).max(14),
    longitude: z.coerce.number().min(76).max(81),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    photos: z.array(z.string()).optional(),
    photoUrl: z.string().optional(),
    imageValidation: z.any().optional(),
  })
  .refine(
    (data) => {
      const hasText = Boolean(data.description && data.description.trim().length > 0);
      const hasVoice = Boolean(data.voiceAudio && data.voiceAudio.trim().length > 0);
      return hasText || hasVoice;
    },
    {
      message: 'Please describe the civic issue using text, voice, or both.',
      path: ['description'],
    }
  );

export const complaintController = {
  // GET /api/complaints
  getAll: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const {
        status,
        category,
        search,
        reportedById,
        assignedToId,
        assignedEmployeeId,
        assignmentStatus,
        verificationStatus,
        page = '1',
        limit = '50',
      } = req.query;

      const filter: any = {};

      // Role-Based Partitioning:
      // If caller is an Employee, they can ONLY see complaints assigned to their employee record
      if (req.user?.role === 'EMPLOYEE') {
        const emp = await Employee.findOne({ userId: req.user.id });
        if (!emp) {
          res.json({ success: true, complaints: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } });
          return;
        }
        filter.assignedEmployeeId = emp._id;
      } else {
        if (reportedById) filter.reportedById = reportedById;
        if (assignedToId) filter.assignedToId = assignedToId;
        if (assignedEmployeeId) filter.assignedEmployeeId = assignedEmployeeId;
      }

      if (status && status !== 'ALL') filter.status = status;
      if (category && category !== 'ALL') filter.category = category;
      if (assignmentStatus && assignmentStatus !== 'ALL') filter.assignmentStatus = assignmentStatus;
      if (verificationStatus && verificationStatus !== 'ALL') filter.verificationStatus = verificationStatus;

      if (search) {
        const q = (search as string).trim();
        filter.$or = [
          { complaintId: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { location: { $regex: q, $options: 'i' } },
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [complaints, total] = await Promise.all([
        Complaint.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('reportedById', 'name username phone location accountNumber')
          .populate('assignedEmployeeId', 'fullName employeeId department designation')
          .lean(),
        Complaint.countDocuments(filter),
      ]);

      const formatted = complaints.map((c) => ({
        ...c,
        id: c._id.toString(),
      }));

      res.json({
        success: true,
        complaints: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('getAll complaints error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve complaints.' });
    }
  },

  // GET /api/complaints/:id
  getById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;

      const complaint = await Complaint.findById(id)
        .populate('reportedById', 'name username phone location avatarUrl fraudScore accountNumber')
        .populate('assignedToId', 'name username phone location avatarUrl department designation')
        .populate('assignedEmployeeId', 'fullName employeeId phone department designation assignedZone')
        .lean();

      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      // Security check: Employee can only view their own assigned report
      if (req.user?.role === 'EMPLOYEE') {
        const emp = await Employee.findOne({ userId: req.user.id });
        const assignedEmpId = (complaint.assignedEmployeeId as any)?._id?.toString() || complaint.assignedEmployeeId?.toString();
        if (!emp || assignedEmpId !== emp._id.toString()) {
          res.status(403).json({ success: false, message: 'Access forbidden for this report.' });
          return;
        }
      }

      res.json({
        success: true,
        complaint: {
          ...complaint,
          id: complaint._id.toString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving complaint.' });
    }
  },

  // POST /api/complaints/validate-image
  validateImage: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { category, photo } = req.body;
      if (!category || !photo) {
        res.status(400).json({ success: false, message: 'Category and photo are required for validation.' });
        return;
      }
      const validation = await validateCivicImage(category, photo);
      res.json({ success: true, validation });
    } catch (error: any) {
      console.error('validateImage error:', error);
      res.status(500).json({ success: false, message: 'Failed to validate image.' });
    }
  },

  // POST /api/complaints
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Please log in to submit a complaint.' });
        return;
      }

      const validation = createComplaintSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { category, description, voiceAudio, voiceDuration, location, district, latitude, longitude, priority } = validation.data;

      // Handle photos from files or body
      const photoUrls: string[] = [];
      const userUploadedPhotos: string[] = [];
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          const url = await uploadToCloudinary(file.buffer);
          photoUrls.push(url);
          userUploadedPhotos.push(url);
        }
      } else if (req.body.photos && Array.isArray(req.body.photos)) {
        photoUrls.push(...req.body.photos);
        userUploadedPhotos.push(...req.body.photos);
      } else if (req.body.photoUrl) {
        photoUrls.push(req.body.photoUrl);
        userUploadedPhotos.push(req.body.photoUrl);
      }

      // Backend AI Vision Verification of uploaded photos
      let primaryAiValidation: any = null;
      if (userUploadedPhotos.length > 0) {
        for (const photo of userUploadedPhotos) {
          const imgVal = await validateCivicImage(category, photo);
          if (!primaryAiValidation) {
            primaryAiValidation = imgVal;
          }
          if (imgVal.decision === 'MISMATCH' || imgVal.decision === 'UNCERTAIN') {
            res.status(422).json({
              success: false,
              message: `AI Image validation failed: The uploaded photo does not clearly match the selected category (${category}). Status: ${imgVal.decision}. Reason: ${imgVal.reason}`,
              validation: imgVal,
            });
            return;
          }
        }
      }

      if (photoUrls.length === 0) {
        const defaultPlaceholders: Record<string, string> = {
          ROAD_DAMAGE: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
          STREET_LIGHT: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800',
          ELECTRICAL_WIRE: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800',
          GARBAGE_WASTE: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
          STORM_WATER_DRAIN: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800',
          PUBLIC_SPACE: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800',
        };
        photoUrls.push(defaultPlaceholders[category] || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800');
      }

      const complaintId = generateComplaintId(location);

      // Evaluate fraud heuristics (scores account security, does NOT delete account)
      const userComplaints = await Complaint.find({ reportedById: req.user.id }).lean();
      const rejectedCount = userComplaints.filter((c) => c.status === 'REJECTED').length;
      const previousCoordinates = userComplaints.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
      }));

      const fraudResult = evaluateComplaintFraud(
        { description, location, latitude, longitude, photoUrls },
        {
          id: req.user.id,
          phone: req.user.phone,
          location: req.user.location,
          currentFraudScore: req.user.fraudScore,
          isBanned: req.user.isBanned,
          rejectedComplaintsCount: rejectedCount,
          previousComplaintCoordinates: previousCoordinates,
          accountsWithSamePhoneCount: 1,
          existingPhotoUrls: [],
        }
      );

      // Create Complaint in MongoDB
      const newComplaint = await Complaint.create({
        complaintId,
        category,
        description: description || '',
        location,
        district: district || null,
        latitude,
        longitude,
        status: 'SUBMITTED',
        priority,
        assignmentStatus: 'PENDING_ASSIGNMENT',
        verificationStatus: 'PENDING_VERIFICATION',
        reportedById: req.user.id,
        voiceRecordingUrl: voiceAudio || null,
        voiceDuration: voiceDuration || 0,
        aiValidation: primaryAiValidation || null,
        photos: photoUrls.map((url) => ({
          url,
          type: 'BEFORE',
          uploadedAt: new Date(),
        })),
        timeline: [
          {
            stage: 'SUBMITTED',
            timestamp: new Date(),
            notes: 'Citizen report filed and awaiting assignment and verification.',
          },
        ],
        fraudFlags: fraudResult.flags.map((f) => ({
          reason: f.reason,
          score: f.score,
          createdAt: new Date(),
        })),
      });

      // Update user fraud score if flags triggered
      if (fraudResult.score > 0) {
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { fraudScore: fraudResult.score },
        });
      }

      // Send SMS alert
      await smsService.sendComplaintAck(req.user.phone, complaintId, category).catch(() => {});

      // Calculate and set due date based on SLA
      try {
        const resolutionDays = await getResolutionDays(priority, category);
        const dueDate = calculateDueDate(new Date(), resolutionDays);
        newComplaint.dueDate = dueDate;
        await newComplaint.save();
      } catch (slaError) {
        console.error('SLA calculation error (non-blocking):', slaError);
      }

      // Create initial audit event
      try {
        await ComplaintEvent.create({
          complaintId: newComplaint._id,
          eventType: 'COMPLAINT_SUBMITTED',
          actorId: req.user.id,
          actorRole: req.user.role,
          actorName: req.user.name || req.user.username,
          timestamp: new Date(),
          description: 'Citizen complaint submitted.',
        });
      } catch (eventError) {
        console.error('Event creation error (non-blocking):', eventError);
      }

      console.log(`[COMPLAINT-CREATED] ${complaintId} stored in MongoDB permanently.`);

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully.',
        complaint: newComplaint.toJSON(),
      });
    } catch (error: any) {
      console.error('Create complaint error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
    }
  },

  // POST /api/complaints/:id/assign-employee (Officer / Controller only)
  assignEmployee: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN')) {
        res.status(403).json({ success: false, message: 'Only authorized Officers/Controllers can assign employees.' });
        return;
      }

      const { id } = req.params;
      const { employeeId, notes, reason } = req.body;

      const complaint = await Complaint.findById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      const employee = await Employee.findById(employeeId);
      if (!employee || employee.accountStatus === 'DISABLED') {
        res.status(400).json({ success: false, message: 'Active employee must be selected.' });
        return;
      }

      // Check if reassigning from a previous employee
      let previousEmployee: any = null;
      const isReassignment = Boolean(
        complaint.assignedEmployeeId &&
        complaint.assignedEmployeeId.toString() !== employee._id.toString()
      );

      if (isReassignment) {
        previousEmployee = await Employee.findById(complaint.assignedEmployeeId);
        // Mark previous assignments as REASSIGNED
        await AssignmentHistory.updateMany(
          { complaintId: complaint._id, status: 'ACTIVE' },
          { status: 'REASSIGNED' }
        );
      }

      // 1. Record AssignmentHistory in MongoDB
      await AssignmentHistory.create({
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        employeeId: employee._id,
        employeeName: `${employee.fullName} (${employee.employeeId})`,
        assignedByUserId: req.user.id,
        assignedByUserName: req.user.name || req.user.username,
        previousEmployeeId: previousEmployee ? previousEmployee._id : null,
        previousEmployeeName: previousEmployee
          ? `${previousEmployee.fullName} (${previousEmployee.employeeId})`
          : null,
        reassignmentReason: reason || notes || (isReassignment ? 'Reassigned by Officer' : 'Initial assignment'),
        assignedAt: new Date(),
        status: 'ACTIVE',
      });

      // 2. Update Complaint in MongoDB
      complaint.assignedEmployeeId = employee._id;
      complaint.assignmentStatus = isReassignment ? 'REASSIGNED' : 'ASSIGNED';
      complaint.status = complaint.status === 'SUBMITTED' ? 'ASSIGNED' : complaint.status;
      complaint.assignedAt = new Date();

      complaint.timeline.push({
        stage: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
        timestamp: new Date(),
        officerName: req.user.name || req.user.username,
        notes: isReassignment
          ? `Work order reassigned from ${previousEmployee?.fullName || 'previous staff'} to ${employee.fullName} (${employee.employeeId}). Reason: ${reason || notes || 'Operational adjustment'}`
          : `Work order assigned to field staff ${employee.fullName} (${employee.employeeId}). Notes: ${notes || 'Assigned for inspection'}`,
      });

      await complaint.save();

      // Create assignment audit event
      try {
        await ComplaintEvent.create({
          complaintId: complaint._id,
          eventType: isReassignment ? 'REASSIGNED' : 'EMPLOYEE_ASSIGNED',
          actorId: req.user.id,
          actorRole: req.user.role,
          actorName: req.user.name || req.user.username,
          timestamp: new Date(),
          description: isReassignment
            ? `Reassigned from ${previousEmployee?.fullName || 'previous staff'} to ${employee.fullName}`
            : `Assigned to ${employee.fullName} (${employee.employeeId})`,
        });
      } catch (eventError) {
        console.error('Event creation error (non-blocking):', eventError);
      }

      console.log(`[ASSIGNMENT] ${complaint.complaintId} assigned to ${employee.fullName} by ${req.user.username}`);

      res.json({
        success: true,
        message: `Complaint assigned to ${employee.fullName} (${employee.employeeId}).`,
        complaint: complaint.toJSON(),
      });
    } catch (error: any) {
      console.error('assignEmployee error:', error);
      res.status(500).json({ success: false, message: 'Failed to assign employee.' });
    }
  },

  // GET /api/complaints/:id/assignment-history
  getAssignmentHistory: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;

      const history = await AssignmentHistory.find({ complaintId: id })
        .sort({ assignedAt: -1 })
        .lean();

      res.json({
        success: true,
        count: history.length,
        history: history.map((h) => ({
          ...h,
          id: h._id.toString(),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving assignment history.' });
    }
  },

  // POST /api/complaints/:id/verify (Officer / Manager verification desk)
  verifyReport: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN')) {
        res.status(403).json({ success: false, message: 'Only authorized Officers can perform verification sign-offs.' });
        return;
      }

      const { id } = req.params;
      const { verificationResult, verificationNotes, progressStatus } = req.body;

      if (!['GENUINE', 'FAKE', 'NEEDS_REVIEW'].includes(verificationResult)) {
        res.status(400).json({ success: false, message: 'Verification result must be GENUINE, FAKE, or NEEDS_REVIEW.' });
        return;
      }

      const complaint = await Complaint.findById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      complaint.verificationStatus = verificationResult;
      complaint.verifiedByUserId = req.user.id;
      complaint.verifiedByName = `${req.user.name || req.user.username} (Officer)`;
      complaint.verifiedAt = new Date();
      complaint.verificationNotes = verificationNotes || `Report verified as ${verificationResult}`;

      if (progressStatus && ['IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(progressStatus)) {
        complaint.status = progressStatus;
        if (progressStatus === 'RESOLVED') complaint.resolvedAt = new Date();
      }

      complaint.timeline.push({
        stage: `VERIFIED_${verificationResult}`,
        timestamp: new Date(),
        officerName: req.user.name || req.user.username,
        notes: verificationNotes || `Officer verification marked: ${verificationResult}`,
      });

      await complaint.save();

      // Create persistent ReportVerification log
      await ReportVerification.create({
        complaintId: complaint._id,
        complaintCode: complaint.complaintId,
        verifiedByUserId: req.user.id,
        verifiedByName: req.user.name || req.user.username,
        verificationResult,
        verificationNotes: verificationNotes || `Report marked ${verificationResult}`,
        verifiedAt: new Date(),
      });

      console.log(`[REPORT-VERIFIED-OFFICER] ${complaint.complaintId} verified as ${verificationResult}`);

      res.json({
        success: true,
        message: `Report marked as ${verificationResult}. Verification saved in MongoDB.`,
        complaint: complaint.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to record report verification.' });
    }
  },

  // POST /api/complaints/:id/status
  updateStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;
      const { status, notes, rejectionReason } = req.body;

      const validStatuses = ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'VIEWED', 'SITE_VISIT_COMPLETED', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status stage.' });
        return;
      }

      const complaint = await Complaint.findById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      const isResolved = status === 'RESOLVED';
      const isRejected = status === 'REJECTED';

      complaint.status = status;
      if (isResolved) complaint.resolvedAt = new Date();
      if (isRejected) complaint.rejectionReason = rejectionReason || notes || 'Rejected by officer';

      complaint.timeline.push({
        stage: status,
        timestamp: new Date(),
        officerName: req.user?.username,
        notes: notes || `Status updated to ${status}`,
      });

      await complaint.save();

      // Notify citizen if email/phone exists
      const citizen = await User.findById(complaint.reportedById);
      if (citizen) {
        if (isResolved) {
          await smsService.sendResolutionAlert(citizen.phone, complaint.complaintId).catch(() => {});
        }
        await emailService.sendComplaintStatusUpdate(citizen.email, complaint.complaintId, status, notes).catch(() => {});
      }

      res.json({
        success: true,
        message: `Complaint status updated to ${status}.`,
        complaint: complaint.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating complaint status.' });
    }
  },

  // GET /api/complaints/nearby
  getNearby: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const lat = parseFloat(req.query.latitude as string);
      const lng = parseFloat(req.query.longitude as string);
      const radius = parseFloat((req.query.radius as string) || '5');

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ success: false, message: 'Valid latitude and longitude required.' });
        return;
      }

      const all = await Complaint.find().populate('reportedById', 'name username').lean();
      const nearby = all
        .map((c) => ({
          ...c,
          id: c._id.toString(),
          distanceKm: Number(calculateDistance(lat, lng, c.latitude, c.longitude).toFixed(2)),
        }))
        .filter((c) => c.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      res.json({
        success: true,
        count: nearby.length,
        radiusKm: radius,
        complaints: nearby,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch nearby complaints.' });
    }
  },

  // GET /api/complaints/user/:userId
  getByUser: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { userId } = req.params;
      if (!userId || userId === 'undefined' || userId === 'null') {
        res.json({ success: true, count: 0, complaints: [] });
        return;
      }
      const userComplaints = await Complaint.find({ reportedById: userId })
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        count: userComplaints.length,
        complaints: userComplaints.map((c) => ({
          ...c,
          id: c._id.toString(),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving user complaints.' });
    }
  },

  // DELETE /api/complaints/:id (Admin only)
  delete: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = _req.params;
      const deleted = await Complaint.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }
      res.json({ success: true, message: 'Complaint deleted permanently.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error deleting complaint.' });
    }
  },
};
