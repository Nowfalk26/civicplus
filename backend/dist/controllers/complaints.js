"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complaintController = void 0;
const zod_1 = require("zod");
const Complaint_1 = require("../models/Complaint");
const Employee_1 = require("../models/Employee");
const User_1 = require("../models/User");
const AssignmentHistory_1 = require("../models/AssignmentHistory");
const ReportVerification_1 = require("../models/ReportVerification");
const db_1 = require("../lib/db");
const generateId_1 = require("../utils/generateId");
const calculateDistance_1 = require("../utils/calculateDistance");
const fraudDetection_1 = require("../services/fraudDetection");
const upload_1 = require("../middleware/upload");
const sms_1 = require("../services/sms");
const email_1 = require("../services/email");
const createComplaintSchema = zod_1.z.object({
    category: zod_1.z.enum([
        'ROAD_DAMAGE',
        'STREET_LIGHT',
        'ELECTRICAL_WIRE',
        'GARBAGE_WASTE',
        'STORM_WATER_DRAIN',
        'PUBLIC_SPACE',
    ]),
    description: zod_1.z.string().min(10, 'Please describe the issue in at least 10 characters').max(500),
    location: zod_1.z.string().min(3, 'Location is required'),
    latitude: zod_1.z.coerce.number().min(8).max(14),
    longitude: zod_1.z.coerce.number().min(76).max(81),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});
exports.complaintController = {
    // GET /api/complaints
    getAll: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { status, category, search, reportedById, assignedToId, assignedEmployeeId, assignmentStatus, verificationStatus, page = '1', limit = '50', } = req.query;
            const filter = {};
            // Role-Based Partitioning:
            // If caller is an Employee, they can ONLY see complaints assigned to their employee record
            if (req.user?.role === 'EMPLOYEE') {
                const emp = await Employee_1.Employee.findOne({ userId: req.user.id });
                if (!emp) {
                    res.json({ success: true, complaints: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } });
                    return;
                }
                filter.assignedEmployeeId = emp._id;
            }
            else {
                if (reportedById)
                    filter.reportedById = reportedById;
                if (assignedToId)
                    filter.assignedToId = assignedToId;
                if (assignedEmployeeId)
                    filter.assignedEmployeeId = assignedEmployeeId;
            }
            if (status && status !== 'ALL')
                filter.status = status;
            if (category && category !== 'ALL')
                filter.category = category;
            if (assignmentStatus && assignmentStatus !== 'ALL')
                filter.assignmentStatus = assignmentStatus;
            if (verificationStatus && verificationStatus !== 'ALL')
                filter.verificationStatus = verificationStatus;
            if (search) {
                const q = search.trim();
                filter.$or = [
                    { complaintId: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } },
                    { location: { $regex: q, $options: 'i' } },
                ];
            }
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
            const skip = (pageNum - 1) * limitNum;
            const [complaints, total] = await Promise.all([
                Complaint_1.Complaint.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .populate('reportedById', 'name username phone location accountNumber')
                    .populate('assignedEmployeeId', 'fullName employeeId department designation')
                    .lean(),
                Complaint_1.Complaint.countDocuments(filter),
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
        }
        catch (error) {
            console.error('getAll complaints error:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve complaints.' });
        }
    },
    // GET /api/complaints/:id
    getById: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const complaint = await Complaint_1.Complaint.findById(id)
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
                const emp = await Employee_1.Employee.findOne({ userId: req.user.id });
                const assignedEmpId = complaint.assignedEmployeeId?._id?.toString() || complaint.assignedEmployeeId?.toString();
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving complaint.' });
        }
    },
    // POST /api/complaints
    create: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
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
            const { category, description, location, latitude, longitude, priority } = validation.data;
            // Handle photos from files or body
            const photoUrls = [];
            const files = req.files;
            if (files && files.length > 0) {
                for (const file of files) {
                    const url = await (0, upload_1.uploadToCloudinary)(file.buffer);
                    photoUrls.push(url);
                }
            }
            else if (req.body.photos && Array.isArray(req.body.photos)) {
                photoUrls.push(...req.body.photos);
            }
            else if (req.body.photoUrl) {
                photoUrls.push(req.body.photoUrl);
            }
            if (photoUrls.length === 0) {
                const defaultPlaceholders = {
                    ROAD_DAMAGE: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
                    STREET_LIGHT: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800',
                    ELECTRICAL_WIRE: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800',
                    GARBAGE_WASTE: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800',
                    STORM_WATER_DRAIN: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800',
                    PUBLIC_SPACE: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800',
                };
                photoUrls.push(defaultPlaceholders[category] || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800');
            }
            const complaintId = (0, generateId_1.generateComplaintId)(location);
            // Evaluate fraud heuristics (scores account security, does NOT delete account)
            const userComplaints = await Complaint_1.Complaint.find({ reportedById: req.user.id }).lean();
            const rejectedCount = userComplaints.filter((c) => c.status === 'REJECTED').length;
            const previousCoordinates = userComplaints.map((c) => ({
                latitude: c.latitude,
                longitude: c.longitude,
            }));
            const fraudResult = (0, fraudDetection_1.evaluateComplaintFraud)({ description, location, latitude, longitude, photoUrls }, {
                id: req.user.id,
                phone: req.user.phone,
                location: req.user.location,
                currentFraudScore: req.user.fraudScore,
                isBanned: req.user.isBanned,
                rejectedComplaintsCount: rejectedCount,
                previousComplaintCoordinates: previousCoordinates,
                accountsWithSamePhoneCount: 1,
                existingPhotoUrls: [],
            });
            // Create Complaint in MongoDB
            const newComplaint = await Complaint_1.Complaint.create({
                complaintId,
                category,
                description,
                location,
                latitude,
                longitude,
                status: 'SUBMITTED',
                priority,
                assignmentStatus: 'PENDING_ASSIGNMENT',
                verificationStatus: 'PENDING_VERIFICATION',
                reportedById: req.user.id,
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
                await User_1.User.findByIdAndUpdate(req.user.id, {
                    $inc: { fraudScore: fraudResult.score },
                });
            }
            // Send SMS alert
            await sms_1.smsService.sendComplaintAck(req.user.phone, complaintId, category).catch(() => { });
            console.log(`[COMPLAINT-CREATED] ${complaintId} stored in MongoDB permanently.`);
            res.status(201).json({
                success: true,
                message: 'Complaint submitted successfully.',
                complaint: newComplaint.toJSON(),
            });
        }
        catch (error) {
            console.error('Create complaint error:', error);
            res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
        }
    },
    // POST /api/complaints/:id/assign-employee (Officer / Controller only)
    assignEmployee: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            if (!req.user || (req.user.role !== 'OFFICER' && req.user.role !== 'ADMIN')) {
                res.status(403).json({ success: false, message: 'Only authorized Officers/Controllers can assign employees.' });
                return;
            }
            const { id } = req.params;
            const { employeeId, notes, reason } = req.body;
            const complaint = await Complaint_1.Complaint.findById(id);
            if (!complaint) {
                res.status(404).json({ success: false, message: 'Complaint not found.' });
                return;
            }
            const employee = await Employee_1.Employee.findById(employeeId);
            if (!employee || employee.accountStatus === 'DISABLED') {
                res.status(400).json({ success: false, message: 'Active employee must be selected.' });
                return;
            }
            // Check if reassigning from a previous employee
            let previousEmployee = null;
            const isReassignment = Boolean(complaint.assignedEmployeeId &&
                complaint.assignedEmployeeId.toString() !== employee._id.toString());
            if (isReassignment) {
                previousEmployee = await Employee_1.Employee.findById(complaint.assignedEmployeeId);
                // Mark previous assignments as REASSIGNED
                await AssignmentHistory_1.AssignmentHistory.updateMany({ complaintId: complaint._id, status: 'ACTIVE' }, { status: 'REASSIGNED' });
            }
            // 1. Record AssignmentHistory in MongoDB
            await AssignmentHistory_1.AssignmentHistory.create({
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
            console.log(`[ASSIGNMENT] ${complaint.complaintId} assigned to ${employee.fullName} by ${req.user.username}`);
            res.json({
                success: true,
                message: `Complaint assigned to ${employee.fullName} (${employee.employeeId}).`,
                complaint: complaint.toJSON(),
            });
        }
        catch (error) {
            console.error('assignEmployee error:', error);
            res.status(500).json({ success: false, message: 'Failed to assign employee.' });
        }
    },
    // GET /api/complaints/:id/assignment-history
    getAssignmentHistory: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const history = await AssignmentHistory_1.AssignmentHistory.find({ complaintId: id })
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving assignment history.' });
        }
    },
    // POST /api/complaints/:id/verify (Officer / Manager verification desk)
    verifyReport: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
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
            const complaint = await Complaint_1.Complaint.findById(id);
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
                if (progressStatus === 'RESOLVED')
                    complaint.resolvedAt = new Date();
            }
            complaint.timeline.push({
                stage: `VERIFIED_${verificationResult}`,
                timestamp: new Date(),
                officerName: req.user.name || req.user.username,
                notes: verificationNotes || `Officer verification marked: ${verificationResult}`,
            });
            await complaint.save();
            // Create persistent ReportVerification log
            await ReportVerification_1.ReportVerification.create({
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to record report verification.' });
        }
    },
    // POST /api/complaints/:id/status
    updateStatus: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { status, notes, rejectionReason } = req.body;
            const validStatuses = ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ success: false, message: 'Invalid status stage.' });
                return;
            }
            const complaint = await Complaint_1.Complaint.findById(id);
            if (!complaint) {
                res.status(404).json({ success: false, message: 'Complaint not found.' });
                return;
            }
            const isResolved = status === 'RESOLVED';
            const isRejected = status === 'REJECTED';
            complaint.status = status;
            if (isResolved)
                complaint.resolvedAt = new Date();
            if (isRejected)
                complaint.rejectionReason = rejectionReason || notes || 'Rejected by officer';
            complaint.timeline.push({
                stage: status,
                timestamp: new Date(),
                officerName: req.user?.username,
                notes: notes || `Status updated to ${status}`,
            });
            await complaint.save();
            // Notify citizen if email/phone exists
            const citizen = await User_1.User.findById(complaint.reportedById);
            if (citizen) {
                if (isResolved) {
                    await sms_1.smsService.sendResolutionAlert(citizen.phone, complaint.complaintId).catch(() => { });
                }
                await email_1.emailService.sendComplaintStatusUpdate(citizen.email, complaint.complaintId, status, notes).catch(() => { });
            }
            res.json({
                success: true,
                message: `Complaint status updated to ${status}.`,
                complaint: complaint.toJSON(),
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error updating complaint status.' });
        }
    },
    // GET /api/complaints/nearby
    getNearby: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const lat = parseFloat(req.query.latitude);
            const lng = parseFloat(req.query.longitude);
            const radius = parseFloat(req.query.radius || '5');
            if (isNaN(lat) || isNaN(lng)) {
                res.status(400).json({ success: false, message: 'Valid latitude and longitude required.' });
                return;
            }
            const all = await Complaint_1.Complaint.find().populate('reportedById', 'name username').lean();
            const nearby = all
                .map((c) => ({
                ...c,
                id: c._id.toString(),
                distanceKm: Number((0, calculateDistance_1.calculateDistance)(lat, lng, c.latitude, c.longitude).toFixed(2)),
            }))
                .filter((c) => c.distanceKm <= radius)
                .sort((a, b) => a.distanceKm - b.distanceKm);
            res.json({
                success: true,
                count: nearby.length,
                radiusKm: radius,
                complaints: nearby,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch nearby complaints.' });
        }
    },
    // GET /api/complaints/user/:userId
    getByUser: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { userId } = req.params;
            const userComplaints = await Complaint_1.Complaint.find({ reportedById: userId })
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving user complaints.' });
        }
    },
    // DELETE /api/complaints/:id (Admin only)
    delete: async (_req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = _req.params;
            const deleted = await Complaint_1.Complaint.findByIdAndDelete(id);
            if (!deleted) {
                res.status(404).json({ success: false, message: 'Complaint not found.' });
                return;
            }
            res.json({ success: true, message: 'Complaint deleted permanently.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error deleting complaint.' });
        }
    },
};
