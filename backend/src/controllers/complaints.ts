import { Response } from 'express';
import { z } from 'zod';
import { inMemoryDb } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateComplaintId } from '../utils/generateId';
import { calculateDistance } from '../utils/calculateDistance';
import { evaluateComplaintFraud } from '../services/fraudDetection';
import { uploadToCloudinary } from '../middleware/upload';
import { smsService } from '../services/sms';
import { emailService } from '../services/email';

const createComplaintSchema = z.object({
  category: z.enum([
    'ROAD_DAMAGE',
    'STREET_LIGHT',
    'ELECTRICAL_WIRE',
    'GARBAGE_WASTE',
    'STORM_WATER_DRAIN',
    'PUBLIC_SPACE',
  ]),
  description: z.string().min(10, 'Please describe the issue in at least 10 characters').max(500),
  location: z.string().min(3, 'Location is required'),
  latitude: z.coerce.number().min(8).max(14), // Tamil Nadu roughly 8°N to 13.5°N
  longitude: z.coerce.number().min(76).max(81), // Tamil Nadu roughly 76°E to 80.5°E
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const complaintController = {
  // GET /api/complaints
  getAll: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await inMemoryDb.ensureSynced();
      const {
        status,
        category,
        search,
        reportedById,
        assignedToId,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const { complaints, total } = inMemoryDb.findComplaints({
        status: status as string,
        category: category as string,
        search: search as string,
        reportedById: reportedById as string,
        assignedToId: assignedToId as string,
        offset,
        limit: limitNum,
      });

      res.json({
        success: true,
        complaints,
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
      const { id } = req.params;
      const complaint = inMemoryDb.findComplaintById(id);

      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      // Populate reporter and assigned officer
      const reporter = inMemoryDb.findUserById(complaint.reportedById);
      const assignedOfficer = complaint.assignedToId
        ? inMemoryDb.findUserById(complaint.assignedToId)
        : null;

      res.json({
        success: true,
        complaint: {
          ...complaint,
          reportedBy: reporter
            ? {
                id: reporter.id,
                username: reporter.username,
                phone: reporter.phone,
                location: reporter.location,
                avatarUrl: reporter.avatarUrl,
                fraudScore: reporter.fraudScore,
              }
            : null,
          assignedTo: assignedOfficer
            ? {
                id: assignedOfficer.id,
                username: assignedOfficer.username,
                phone: assignedOfficer.phone,
                location: assignedOfficer.location,
                avatarUrl: assignedOfficer.avatarUrl,
              }
            : null,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving complaint.' });
    }
  },

  // POST /api/complaints
  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Please log in to submit a complaint.' });
        return;
      }

      await inMemoryDb.ensureSynced();

      const validation = createComplaintSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { category, description, location, latitude, longitude, priority } = validation.data;

      // Handle photos: from req.files (Multer) or fallback body array
      const photoUrls: string[] = [];
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (const file of files) {
          const url = await uploadToCloudinary(file.buffer);
          photoUrls.push(url);
        }
      } else if (req.body.photos && Array.isArray(req.body.photos)) {
        photoUrls.push(...req.body.photos);
      } else if (req.body.photoUrl) {
        photoUrls.push(req.body.photoUrl);
      }

      // Enforce at least 1 photo for accountability
      if (photoUrls.length === 0) {
        // Provide standard category placeholder photo if none uploaded in demo
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

      // Generate TN Complaint ID format: TN-TIR-2026-XXXXX
      const complaintId = generateComplaintId(location);

      // Fetch user context for Fraud Detection
      const userComplaints = inMemoryDb.complaints.filter((c) => c.reportedById === req.user!.id);
      const rejectedCount = userComplaints.filter((c) => c.status === 'REJECTED').length;
      const previousCoordinates = userComplaints.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
      }));
      const samePhoneAccounts = inMemoryDb.users.filter((u) => u.phone === req.user!.phone).length;
      const existingPhotos = inMemoryDb.complaints
        .flatMap((c) => c.photos)
        .map((p) => p.url);

      // Execute Fraud Evaluation Rule Engine
      const fraudResult = evaluateComplaintFraud(
        {
          description,
          location,
          latitude,
          longitude,
          photoUrls,
        },
        {
          id: req.user.id,
          phone: req.user.phone,
          location: req.user.location,
          currentFraudScore: req.user.fraudScore,
          isBanned: req.user.isBanned,
          rejectedComplaintsCount: rejectedCount,
          previousComplaintCoordinates: previousCoordinates,
          accountsWithSamePhoneCount: samePhoneAccounts,
          existingPhotoUrls: existingPhotos,
        }
      );

      // Create Complaint Record
      const newComplaint = inMemoryDb.createComplaint({
        complaintId,
        category,
        description,
        location,
        latitude,
        longitude,
        status: 'SUBMITTED',
        priority,
        reportedById: req.user.id,
        assignedToId: null,
        photos: photoUrls.map((url) => ({
          url,
          type: 'BEFORE',
        })),
      });

      // Attach fraud flags if any detected
      for (const flag of fraudResult.flags) {
        inMemoryDb.addFraudFlag(newComplaint.id, flag.reason, flag.score);
      }

      // Update user fraud score & auto-ban if threshold exceeded
      if (fraudResult.score > 0) {
        inMemoryDb.updateUser(req.user.id, {
          fraudScore: fraudResult.newTotalScore,
          ...(fraudResult.shouldAutoBan
            ? {
                isBanned: true,
                bannedUntil: fraudResult.bannedUntil?.toISOString(),
              }
            : {}),
        });

        if (fraudResult.shouldAutoBan && fraudResult.bannedUntil) {
          await emailService.sendSuspensionNotice(
            req.user.email,
            req.user.username,
            fraudResult.newTotalScore,
            fraudResult.bannedUntil
          );
        }
      }

      // Send SMS acknowledgment
      await smsService.sendComplaintAck(req.user.phone, complaintId, category);

      // Persist complaint and any fraud updates across all serverless instances
      await inMemoryDb.persistAsync();

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully.',
        complaint: inMemoryDb.findComplaintById(newComplaint.id),
        fraudDetection: {
          pointsAssigned: fraudResult.score,
          flags: fraudResult.flags,
          userTotalFraudScore: fraudResult.newTotalScore,
          autoBanned: fraudResult.shouldAutoBan,
        },
      });
    } catch (error: any) {
      console.error('Create complaint error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
    }
  },

  // PUT /api/complaints/:id (Officer / Admin)
  update: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const complaint = inMemoryDb.findComplaintById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      const { priority, description, location } = req.body;
      const updated = inMemoryDb.updateComplaint(id, {
        ...(priority ? { priority } : {}),
        ...(description ? { description } : {}),
        ...(location ? { location } : {}),
      });

      res.json({ success: true, message: 'Complaint updated.', complaint: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating complaint.' });
    }
  },

  // DELETE /api/complaints/:id (Admin only)
  delete: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = _req.params;
      const deleted = inMemoryDb.deleteComplaint(id);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }
      res.json({ success: true, message: 'Complaint deleted permanently.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error deleting complaint.' });
    }
  },

  // POST /api/complaints/:id/assign (Officer / Admin)
  assign: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { officerId, notes } = req.body;

      const complaint = inMemoryDb.findComplaintById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      const officer = inMemoryDb.findUserById(officerId);
      if (!officer || officer.role !== 'OFFICER') {
        res.status(400).json({ success: false, message: 'Valid officer must be specified.' });
        return;
      }

      const updated = inMemoryDb.updateComplaint(id, {
        assignedToId: officer.id,
        assignedAt: new Date().toISOString(),
        status: complaint.status === 'SUBMITTED' ? 'ASSIGNED' : complaint.status,
      });

      inMemoryDb.addTimeline(id, {
        stage: 'ASSIGNED',
        officerName: req.user?.username || officer.username,
        notes: notes || `Work order assigned to ${officer.username} (${officer.location})`,
      });

      res.json({
        success: true,
        message: `Complaint assigned to officer ${officer.username}.`,
        complaint: inMemoryDb.findComplaintById(id),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error assigning complaint.' });
    }
  },

  // POST /api/complaints/:id/status (Officer / Admin)
  updateStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, notes, rejectionReason } = req.body;

      const validStatuses = ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status stage.' });
        return;
      }

      const complaint = inMemoryDb.findComplaintById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      const isResolved = status === 'RESOLVED';
      const isRejected = status === 'REJECTED';

      inMemoryDb.updateComplaint(id, {
        status,
        ...(isResolved ? { resolvedAt: new Date().toISOString() } : {}),
        ...(isRejected ? { rejectionReason: rejectionReason || notes || 'Rejected by officer.' } : {}),
      });

      inMemoryDb.addTimeline(id, {
        stage: status,
        officerName: req.user?.username,
        notes: notes || `Status advanced to ${status}`,
      });

      // Notify citizen
      const citizen = inMemoryDb.findUserById(complaint.reportedById);
      if (citizen) {
        if (isResolved) {
          await smsService.sendResolutionAlert(citizen.phone, complaint.complaintId);
        }
        await emailService.sendComplaintStatusUpdate(citizen.email, complaint.complaintId, status, notes);
      }

      await inMemoryDb.persistAsync();

      res.json({
        success: true,
        message: `Complaint status updated to ${status}.`,
        complaint: inMemoryDb.findComplaintById(id),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating complaint status.' });
    }
  },

  // POST /api/complaints/:id/photo
  uploadPhoto: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { type = 'EVIDENCE', url } = req.body;

      const complaint = inMemoryDb.findComplaintById(id);
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      let finalUrl = url;
      if (req.file) {
        finalUrl = await uploadToCloudinary(req.file.buffer);
      }

      if (!finalUrl) {
        res.status(400).json({ success: false, message: 'No photo provided.' });
        return;
      }

      const photo = inMemoryDb.addPhoto(id, finalUrl, type);
      res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully.',
        photo,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to upload photo.' });
    }
  },

  // GET /api/complaints/nearby?latitude=...&longitude=...&radius=5
  getNearby: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const lat = parseFloat(req.query.latitude as string);
      const lng = parseFloat(req.query.longitude as string);
      const radius = parseFloat((req.query.radius as string) || '5'); // default 5km

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({
          success: false,
          message: 'Valid latitude and longitude parameters are required.',
        });
        return;
      }

      const nearbyComplaints = inMemoryDb.complaints
        .map((c) => ({
          ...c,
          distanceKm: Number(calculateDistance(lat, lng, c.latitude, c.longitude).toFixed(2)),
        }))
        .filter((c) => c.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      res.json({
        success: true,
        count: nearbyComplaints.length,
        radiusKm: radius,
        complaints: nearbyComplaints,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch nearby complaints.' });
    }
  },

  // GET /api/complaints/user/:userId
  getByUser: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const userComplaints = inMemoryDb.complaints
        .filter((c) => c.reportedById === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        count: userComplaints.length,
        complaints: userComplaints,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving user complaints.' });
    }
  },
};
