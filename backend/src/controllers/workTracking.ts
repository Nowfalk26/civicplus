import { Response } from 'express';
import { Complaint } from '../models/Complaint';
import { Employee } from '../models/Employee';
import { User } from '../models/User';
import { ComplaintEvent } from '../models/ComplaintEvent';
import { ComplaintEvidence } from '../models/ComplaintEvidence';
import { getResolutionDays, calculateDueDate } from '../models/SlaConfig';
import { connectDb } from '../lib/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { uploadToCloudinary } from '../middleware/upload';
import { smsService } from '../services/sms';
import { emailService } from '../services/email';
import { calculateDistance } from '../utils/calculateDistance';

/**
 * Helper: resolve a photo URL from either a multer file upload or a body URL/base64 string.
 */
async function resolvePhotoUrl(req: AuthenticatedRequest): Promise<string | null> {
  const file = req.file as Express.Multer.File | undefined;
  if (file && file.buffer) {
    return uploadToCloudinary(file.buffer);
  }
  if (req.body.photoUrl && typeof req.body.photoUrl === 'string' && req.body.photoUrl.trim().length > 0) {
    return req.body.photoUrl.trim();
  }
  return null;
}

/**
 * Helper: find the Employee record for the authenticated EMPLOYEE user.
 */
async function findEmployeeForUser(req: AuthenticatedRequest, res: Response): Promise<any | null> {
  if (!req.user || req.user.role !== 'EMPLOYEE') {
    res.status(403).json({ success: false, message: 'Only assigned employees can perform this action.' });
    return null;
  }
  const employee = await Employee.findOne({ userId: req.user.id });
  if (!employee) {
    res.status(404).json({ success: false, message: 'Employee profile not found.' });
    return null;
  }
  return employee;
}

/**
 * Helper: find a complaint assigned to a specific employee.
 */
async function findAssignedComplaint(complaintId: string, employeeId: string, res: Response): Promise<any | null> {
  const complaint = await Complaint.findOne({ _id: complaintId, assignedEmployeeId: employeeId });
  if (!complaint) {
    res.status(403).json({
      success: false,
      message: 'Complaint not found or you do not have assignment authority for this report.',
    });
    return null;
  }
  return complaint;
}

// Status ordering for validation
const STATUS_ORDER = [
  'SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'VIEWED',
  'SITE_VISIT_COMPLETED', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'IN_PROGRESS',
  'RESOLVED', 'REJECTED',
];

function statusIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export const workTrackingController = {
  /**
   * POST /api/complaints/:id/acknowledge
   * Employee acknowledges/views an assigned complaint.
   */
  acknowledgeComplaint: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const employee = await findEmployeeForUser(req, res);
      if (!employee) return;

      const complaint = await findAssignedComplaint(req.params.id, employee._id, res);
      if (!complaint) return;

      if (complaint.viewedAt) {
        res.status(400).json({ success: false, message: 'Complaint already acknowledged.' });
        return;
      }

      complaint.viewedAt = new Date();
      complaint.viewedBy = employee._id;

      if (statusIndex(complaint.status) <= statusIndex('ASSIGNED')) {
        complaint.status = 'VIEWED';
      }

      complaint.timeline.push({
        stage: 'VIEWED',
        timestamp: new Date(),
        officerName: `${employee.fullName} (${employee.employeeId})`,
        notes: 'Complaint viewed and acknowledged by assigned field employee.',
        actorId: req.user!.id,
      });

      await complaint.save();

      await ComplaintEvent.create({
        complaintId: complaint._id,
        eventType: 'COMPLAINT_VIEWED',
        actorId: req.user!.id,
        actorRole: 'EMPLOYEE',
        actorName: `${employee.fullName} (${employee.employeeId})`,
        timestamp: new Date(),
        description: 'Complaint viewed and acknowledged by assigned employee.',
      }).catch((e: any) => console.error('Event creation error:', e));

      console.log(`[ACKNOWLEDGED] ${complaint.complaintId} by ${employee.fullName}`);

      res.json({
        success: true,
        message: 'Complaint acknowledged successfully.',
        complaint: complaint.toJSON(),
      });
    } catch (error: any) {
      console.error('acknowledgeComplaint error:', error);
      res.status(500).json({ success: false, message: 'Failed to acknowledge complaint.' });
    }
  },

  /**
   * POST /api/complaints/:id/site-visit
   * Employee records a site visit with inspection notes and photo evidence.
   */
  completeSiteVisit: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const employee = await findEmployeeForUser(req, res);
      if (!employee) return;

      const complaint = await findAssignedComplaint(req.params.id, employee._id, res);
      if (!complaint) return;

      const { visitNotes, latitude, longitude, capturedAt, watermarkText } = req.body;
      if (!visitNotes || typeof visitNotes !== 'string' || visitNotes.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Inspection notes are required for site visit.' });
        return;
      }

      const photoUrl = await resolvePhotoUrl(req);
      if (!photoUrl) {
        res.status(400).json({ success: false, message: 'A camera-captured site visit photo is required.' });
        return;
      }

      const numLat = latitude !== undefined && latitude !== null ? Number(latitude) : null;
      const numLon = longitude !== undefined && longitude !== null ? Number(longitude) : null;
      let distKm: number | null = null;
      let isLocationVerified = true;

      if (numLat !== null && numLon !== null && !isNaN(numLat) && !isNaN(numLon) && complaint.latitude && complaint.longitude) {
        distKm = Number(calculateDistance(numLat, numLon, complaint.latitude, complaint.longitude).toFixed(3));
        const geofenceRadius = Number(process.env.GEOFENCE_RADIUS_KM) || 0.5; // 500 meters default
        isLocationVerified = distKm <= geofenceRadius;
      }

      // Auto-acknowledge if not yet viewed
      if (!complaint.viewedAt) {
        complaint.viewedAt = new Date();
        complaint.viewedBy = employee._id;
      }

      complaint.siteVisitAt = new Date();
      complaint.siteVisitBy = employee._id;
      complaint.siteVisitNotes = visitNotes.trim();

      if (statusIndex(complaint.status) < statusIndex('SITE_VISIT_COMPLETED')) {
        complaint.status = 'SITE_VISIT_COMPLETED';
      }

      const captureDate = capturedAt ? new Date(capturedAt) : new Date();

      // Create evidence record
      const evidence = await ComplaintEvidence.create({
        complaintId: complaint._id,
        type: 'SITE_VISIT',
        fileUrl: photoUrl,
        uploadedBy: req.user!.id,
        uploadedByName: `${employee.fullName} (${employee.employeeId})`,
        uploadedAt: new Date(),
        description: visitNotes.trim(),
        latitude: numLat,
        longitude: numLon,
        capturedAt: captureDate,
        distanceFromSiteKm: distKm,
        isLocationVerified,
        watermarkText: watermarkText || null,
      });

      // Add photo to complaint
      complaint.photos.push({
        url: photoUrl,
        type: 'SITE_VISIT',
        uploadedAt: new Date(),
        uploadedBy: `${employee.fullName} (${employee.employeeId})`,
        description: visitNotes.trim(),
        latitude: numLat,
        longitude: numLon,
        capturedAt: captureDate,
        distanceFromSiteKm: distKm,
        isLocationVerified,
      });

      const locationTag = numLat && numLon
        ? ` • GPS: ${numLat.toFixed(4)}° N, ${numLon.toFixed(4)}° E (${isLocationVerified ? 'Location Confirmed' : `${Math.round((distKm || 0) * 1000)}m from site`})`
        : '';

      complaint.timeline.push({
        stage: 'SITE_VISIT_COMPLETED',
        timestamp: new Date(),
        officerName: `${employee.fullName} (${employee.employeeId})`,
        notes: `${visitNotes.trim()}${locationTag}`,
        actorId: req.user!.id,
        evidenceId: evidence._id.toString(),
      });

      await complaint.save();

      await ComplaintEvent.create({
        complaintId: complaint._id,
        eventType: 'SITE_VISIT_COMPLETED',
        actorId: req.user!.id,
        actorRole: 'EMPLOYEE',
        actorName: `${employee.fullName} (${employee.employeeId})`,
        timestamp: new Date(),
        description: `Site visit completed. ${visitNotes.trim()}${locationTag}`,
        evidenceId: evidence._id,
        metadata: {
          latitude: numLat,
          longitude: numLon,
          capturedAt: captureDate.toISOString(),
          distanceFromSiteKm: distKm,
          isLocationVerified,
        },
      }).catch((e: any) => console.error('Event creation error:', e));

      console.log(`[SITE-VISIT] ${complaint.complaintId} by ${employee.fullName} (Verified: ${isLocationVerified})`);

      res.json({
        success: true,
        message: 'Site visit recorded with geo-stamped evidence successfully.',
        complaint: complaint.toJSON(),
      });
    } catch (error: any) {
      console.error('completeSiteVisit error:', error);
      res.status(500).json({ success: false, message: 'Failed to record site visit.' });
    }
  },

  /**
   * POST /api/complaints/:id/start-work
   * Employee marks work as started with description and photo.
   */
  startWork: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const employee = await findEmployeeForUser(req, res);
      if (!employee) return;

      const complaint = await findAssignedComplaint(req.params.id, employee._id, res);
      if (!complaint) return;

      if (complaint.workStartedAt) {
        res.status(400).json({ success: false, message: 'Work has already been started on this complaint.' });
        return;
      }

      const { description, latitude, longitude, capturedAt, watermarkText } = req.body;
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Work start description is required.' });
        return;
      }

      const photoUrl = await resolvePhotoUrl(req);
      if (!photoUrl) {
        res.status(400).json({ success: false, message: 'A camera-captured work-start photo is required.' });
        return;
      }

      const numLat = latitude !== undefined && latitude !== null ? Number(latitude) : null;
      const numLon = longitude !== undefined && longitude !== null ? Number(longitude) : null;
      let distKm: number | null = null;
      let isLocationVerified = true;

      if (numLat !== null && numLon !== null && !isNaN(numLat) && !isNaN(numLon) && complaint.latitude && complaint.longitude) {
        distKm = Number(calculateDistance(numLat, numLon, complaint.latitude, complaint.longitude).toFixed(3));
        const geofenceRadius = Number(process.env.GEOFENCE_RADIUS_KM) || 0.5;
        isLocationVerified = distKm <= geofenceRadius;
      }

      // Auto-acknowledge if not yet viewed
      if (!complaint.viewedAt) {
        complaint.viewedAt = new Date();
        complaint.viewedBy = employee._id;
      }

      const workStartedAt = new Date();
      const captureDate = capturedAt ? new Date(capturedAt) : workStartedAt;

      complaint.workStartedAt = workStartedAt;
      complaint.workStartedBy = employee._id;
      complaint.workStartedNotes = description.trim();
      complaint.status = 'WORK_STARTED';

      // Create evidence
      const evidence = await ComplaintEvidence.create({
        complaintId: complaint._id,
        type: 'WORK_STARTED',
        fileUrl: photoUrl,
        uploadedBy: req.user!.id,
        uploadedByName: `${employee.fullName} (${employee.employeeId})`,
        uploadedAt: workStartedAt,
        description: description.trim(),
        latitude: numLat,
        longitude: numLon,
        capturedAt: captureDate,
        distanceFromSiteKm: distKm,
        isLocationVerified,
        watermarkText: watermarkText || null,
      });

      complaint.photos.push({
        url: photoUrl,
        type: 'WORK_STARTED',
        uploadedAt: workStartedAt,
        uploadedBy: `${employee.fullName} (${employee.employeeId})`,
        description: description.trim(),
        latitude: numLat,
        longitude: numLon,
        capturedAt: captureDate,
        distanceFromSiteKm: distKm,
        isLocationVerified,
      });

      const locationTag = numLat && numLon
        ? ` • GPS: ${numLat.toFixed(4)}° N, ${numLon.toFixed(4)}° E (${isLocationVerified ? 'Location Confirmed' : `${Math.round((distKm || 0) * 1000)}m away`})`
        : '';

      complaint.timeline.push({
        stage: 'WORK_STARTED',
        timestamp: workStartedAt,
        officerName: `${employee.fullName} (${employee.employeeId})`,
        notes: `${description.trim()}${locationTag}`,
        actorId: req.user!.id,
        evidenceId: evidence._id.toString(),
      });

      await complaint.save();

      await ComplaintEvent.create({
        complaintId: complaint._id,
        eventType: 'WORK_STARTED',
        actorId: req.user!.id,
        actorRole: 'EMPLOYEE',
        actorName: `${employee.fullName} (${employee.employeeId})`,
        timestamp: workStartedAt,
        description: `Work started: ${description.trim()}${locationTag}`,
        evidenceId: evidence._id,
        metadata: {
          latitude: numLat,
          longitude: numLon,
          capturedAt: captureDate.toISOString(),
          distanceFromSiteKm: distKm,
          isLocationVerified,
        },
      }).catch((e: any) => console.error('Event creation error:', e));

      console.log(`[WORK-STARTED] ${complaint.complaintId} by ${employee.fullName} (Verified: ${isLocationVerified})`);

      res.json({
        success: true,
        message: 'Work started with geo-stamped evidence. Timer is now running.',
        complaint: complaint.toJSON(),
        workStartedAt: workStartedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('startWork error:', error);
      res.status(500).json({ success: false, message: 'Failed to start work.' });
    }
  },

  /**
   * POST /api/complaints/:id/complete-work
   * Employee marks work as completed with description, photo and calculated duration.
   */
  completeWork: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const employee = await findEmployeeForUser(req, res);
      if (!employee) return;

      const complaint = await findAssignedComplaint(req.params.id, employee._id, res);
      if (!complaint) return;

      if (!complaint.workStartedAt) {
        res.status(400).json({ success: false, message: 'Cannot complete work before starting it.' });
        return;
      }

      if (complaint.completedAt) {
        res.status(400).json({ success: false, message: 'Work has already been completed.' });
        return;
      }

      const { description, latitude, longitude, capturedAt, watermarkText } = req.body;
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Completion description is required.' });
        return;
      }

      const photoUrl = await resolvePhotoUrl(req);
      if (!photoUrl) {
        res.status(400).json({ success: false, message: 'A camera-captured completion photo is required.' });
        return;
      }

      const numLat = latitude !== undefined && latitude !== null ? Number(latitude) : null;
      const numLon = longitude !== undefined && longitude !== null ? Number(longitude) : null;
      let distKm: number | null = null;
      let isLocationVerified = true;

      if (numLat !== null && numLon !== null && !isNaN(numLat) && !isNaN(numLon) && complaint.latitude && complaint.longitude) {
        distKm = Number(calculateDistance(numLat, numLon, complaint.latitude, complaint.longitude).toFixed(3));
        const geofenceRadius = Number(process.env.GEOFENCE_RADIUS_KM) || 0.5;
        isLocationVerified = distKm <= geofenceRadius;
      }

      const completedAt = new Date();
      const captureDate = capturedAt ? new Date(capturedAt) : completedAt;
      const workDuration = completedAt.getTime() - new Date(complaint.workStartedAt).getTime();

      complaint.completedAt = completedAt;
      complaint.completedBy = employee._id;
      complaint.completionNotes = description.trim();
      complaint.workDuration = workDuration;
      complaint.resolvedAt = completedAt; // backward compat
      complaint.status = 'RESOLVED';

      // Create evidence
      const evidence = await ComplaintEvidence.create({
        complaintId: complaint._id,
        type: 'WORK_COMPLETED',
        fileUrl: photoUrl,
        uploadedBy: req.user!.id,
        uploadedByName: `${employee.fullName} (${employee.employeeId})`,
        uploadedAt: completedAt,
        description: description.trim(),
        latitude: numLat,
        longitude: numLon,
        capturedAt: captureDate,
        distanceFromSiteKm: distKm,
        isLocationVerified,
        watermarkText: watermarkText || null,
      });

      complaint.photos.push({
        url: photoUrl,
        type: 'WORK_COMPLETED',
        uploadedAt: completedAt,
        uploadedBy: `${employee.fullName} (${employee.employeeId})`,
        description: description.trim(),
        latitude: numLat,
        longitude: numLon,
        capturedAt: captureDate,
        distanceFromSiteKm: distKm,
        isLocationVerified,
      });

      const locationTag = numLat && numLon
        ? ` • GPS: ${numLat.toFixed(4)}° N, ${numLon.toFixed(4)}° E (${isLocationVerified ? 'Location Confirmed' : `${Math.round((distKm || 0) * 1000)}m away`})`
        : '';

      complaint.timeline.push({
        stage: 'RESOLVED',
        timestamp: completedAt,
        officerName: `${employee.fullName} (${employee.employeeId})`,
        notes: `Work completed. Duration: ${Math.round(workDuration / 60000)} minutes. ${description.trim()}${locationTag}`,
        actorId: req.user!.id,
        evidenceId: evidence._id.toString(),
      });

      await complaint.save();

      await ComplaintEvent.create({
        complaintId: complaint._id,
        eventType: 'WORK_COMPLETED',
        actorId: req.user!.id,
        actorRole: 'EMPLOYEE',
        actorName: `${employee.fullName} (${employee.employeeId})`,
        timestamp: completedAt,
        description: `Work completed: ${description.trim()}. Total work duration: ${Math.round(workDuration / 60000)} minutes.${locationTag}`,
        evidenceId: evidence._id,
        metadata: {
          workDuration,
          latitude: numLat,
          longitude: numLon,
          capturedAt: captureDate.toISOString(),
          distanceFromSiteKm: distKm,
          isLocationVerified,
        },
      }).catch((e: any) => console.error('Event creation error:', e));

      // Notify citizen
      const citizen = await User.findById(complaint.reportedById);
      if (citizen) {
        await smsService.sendResolutionAlert(citizen.phone, complaint.complaintId).catch(() => {});
        await emailService.sendComplaintStatusUpdate(citizen.email, complaint.complaintId, 'RESOLVED', description.trim()).catch(() => {});
      }

      console.log(`[WORK-COMPLETED] ${complaint.complaintId} by ${employee.fullName} (${Math.round(workDuration / 60000)}min)`);

      res.json({
        success: true,
        message: 'Work completed successfully.',
        complaint: complaint.toJSON(),
        workDuration,
      });
    } catch (error: any) {
      console.error('completeWork error:', error);
      res.status(500).json({ success: false, message: 'Failed to complete work.' });
    }
  },

  /**
   * GET /api/complaints/:id/tracking
   * Returns comprehensive tracking data for citizen/employee/officer views.
   */
  getComplaintTracking: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;

      const complaint = await Complaint.findById(id)
        .populate('reportedById', 'name username phone location accountNumber')
        .populate('assignedEmployeeId', 'fullName employeeId phone department designation assignedZone')
        .lean();

      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      // Access control: citizen can only see their own
      if (req.user?.role === 'CITIZEN') {
        const reportedId = (complaint.reportedById as any)?._id?.toString() || complaint.reportedById?.toString();
        if (reportedId !== req.user.id) {
          res.status(403).json({ success: false, message: 'You can only view tracking for your own complaints.' });
          return;
        }
      }
      // Employee can only see assigned
      if (req.user?.role === 'EMPLOYEE') {
        const emp = await Employee.findOne({ userId: req.user.id });
        const assignedId = (complaint.assignedEmployeeId as any)?._id?.toString() || complaint.assignedEmployeeId?.toString();
        if (!emp || assignedId !== emp._id.toString()) {
          res.status(403).json({ success: false, message: 'Access forbidden for this report.' });
          return;
        }
      }

      // Fetch events and evidence
      const [events, evidence] = await Promise.all([
        ComplaintEvent.find({ complaintId: complaint._id }).sort({ timestamp: 1 }).lean(),
        ComplaintEvidence.find({ complaintId: complaint._id }).sort({ uploadedAt: 1 }).lean(),
      ]);

      const now = new Date();
      const complaintAge = now.getTime() - new Date(complaint.createdAt).getTime();

      let actualWorkDuration: number | null = null;
      if (complaint.workStartedAt) {
        if (complaint.completedAt) {
          actualWorkDuration = new Date(complaint.completedAt).getTime() - new Date(complaint.workStartedAt).getTime();
        } else {
          actualWorkDuration = now.getTime() - new Date(complaint.workStartedAt).getTime();
        }
      }

      const isOverdue = complaint.dueDate ? now > new Date(complaint.dueDate) : false;

      const assignedEmp = complaint.assignedEmployeeId as any;

      res.json({
        success: true,
        complaint: {
          id: (complaint as any)._id.toString(),
          complaintId: complaint.complaintId,
          category: complaint.category,
          status: complaint.status,
          priority: complaint.priority,
          description: complaint.description,
          location: complaint.location,
          latitude: complaint.latitude,
          longitude: complaint.longitude,
          createdAt: complaint.createdAt,
          reportedBy: complaint.reportedById,
          photos: complaint.photos,
        },
        tracking: {
          dueDate: complaint.dueDate || null,
          isOverdue,
          complaintAge,
          workStartedAt: complaint.workStartedAt || null,
          completedAt: complaint.completedAt || null,
          workDuration: complaint.workDuration || null,
          actualWorkDuration,
          viewedAt: complaint.viewedAt || null,
          viewedBy: complaint.viewedBy || null,
          siteVisitAt: complaint.siteVisitAt || null,
          siteVisitNotes: complaint.siteVisitNotes || null,
          workStartedNotes: complaint.workStartedNotes || null,
          completionNotes: complaint.completionNotes || null,
          assignedAt: complaint.assignedAt || null,
          assignedEmployee: assignedEmp && assignedEmp.fullName ? {
            fullName: assignedEmp.fullName,
            employeeId: assignedEmp.employeeId,
            department: assignedEmp.department,
            designation: assignedEmp.designation,
          } : null,
        },
        timeline: (complaint.timeline || []).map((t: any) => ({
          ...t,
          id: t._id?.toString(),
        })),
        events: events.map((e) => ({
          ...e,
          id: (e as any)._id.toString(),
        })),
        evidence: evidence.map((e) => ({
          ...e,
          id: (e as any)._id.toString(),
        })),
      });
    } catch (error: any) {
      console.error('getComplaintTracking error:', error);
      res.status(500).json({ success: false, message: 'Error retrieving complaint tracking data.' });
    }
  },

  /**
   * GET /api/complaints/:id/events
   * Returns all audit events for a complaint (Officer/Admin only for full trail).
   */
  getComplaintEvents: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const events = await ComplaintEvent.find({ complaintId: req.params.id })
        .sort({ timestamp: 1 })
        .lean();

      res.json({
        success: true,
        count: events.length,
        events: events.map((e) => ({
          ...e,
          id: (e as any)._id.toString(),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving complaint events.' });
    }
  },

  /**
   * GET /api/complaints/:id/evidence
   * Returns all evidence photos for a complaint.
   */
  getComplaintEvidence: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;

      const complaint = await Complaint.findById(id).lean();
      if (!complaint) {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }

      // Citizen can only see their own evidence
      if (req.user?.role === 'CITIZEN') {
        if (complaint.reportedById.toString() !== req.user.id) {
          res.status(403).json({ success: false, message: 'Access denied.' });
          return;
        }
      }

      const evidence = await ComplaintEvidence.find({ complaintId: id })
        .sort({ uploadedAt: 1 })
        .lean();

      res.json({
        success: true,
        count: evidence.length,
        evidence: evidence.map((e) => ({
          ...e,
          id: (e as any)._id.toString(),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving complaint evidence.' });
    }
  },
};
