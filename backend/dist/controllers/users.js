"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const OfficerRequest_1 = require("../models/OfficerRequest");
const Complaint_1 = require("../models/Complaint");
const db_1 = require("../lib/db");
const Counter_1 = require("../models/Counter");
const email_1 = require("../services/email");
exports.userController = {
    // GET /api/users (Admin only - Reads directly from MongoDB)
    getAll: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { role, search, page = '1', limit = '100' } = req.query;
            const filter = {};
            if (role && role !== 'ALL') {
                filter.role = role;
            }
            if (search) {
                const q = search.trim();
                filter.$or = [
                    { username: { $regex: q, $options: 'i' } },
                    { name: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } },
                    { phone: { $regex: q, $options: 'i' } },
                    { accountNumber: { $regex: q, $options: 'i' } },
                    { department: { $regex: q, $options: 'i' } },
                    { location: { $regex: q, $options: 'i' } },
                ];
            }
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
            const skip = (pageNum - 1) * limitNum;
            const [usersList, total] = await Promise.all([
                User_1.User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
                User_1.User.countDocuments(filter),
            ]);
            // Calculate aggregated metrics from MongoDB for each user
            const enrichedUsers = await Promise.all(usersList.map(async (u) => {
                const [reportsCount, assignedCount, resolvedCount] = await Promise.all([
                    Complaint_1.Complaint.countDocuments({ reportedById: u._id }),
                    Complaint_1.Complaint.countDocuments({ assignedToId: u._id }),
                    Complaint_1.Complaint.countDocuments({ assignedToId: u._id, status: 'RESOLVED' }),
                ]);
                const { password: _, ...userSafe } = u;
                return {
                    ...userSafe,
                    id: u._id.toString(),
                    reportsCount,
                    assignedCount,
                    resolvedCount,
                    presenceStatus: u.presenceStatus || (u.isOnline ? 'ONLINE' : 'OFFLINE'),
                    isOnline: Boolean(u.isOnline),
                    accountStatus: u.accountStatus || (u.isBanned ? 'SUSPENDED' : 'ACTIVE'),
                };
            }));
            // System stats from MongoDB
            const [totalCitizens, totalOfficers, totalAdmins, totalEmployees, totalReports] = await Promise.all([
                User_1.User.countDocuments({ role: 'CITIZEN' }),
                User_1.User.countDocuments({ role: 'OFFICER' }),
                User_1.User.countDocuments({ role: 'ADMIN' }),
                User_1.User.countDocuments({ role: 'EMPLOYEE' }),
                Complaint_1.Complaint.countDocuments(),
            ]);
            res.json({
                success: true,
                users: enrichedUsers,
                stats: {
                    totalCitizens,
                    totalOfficers,
                    totalAdmins,
                    totalEmployees,
                    totalReports,
                },
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        }
        catch (error) {
            console.error('[USERS-API] Error retrieving users from MongoDB:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
        }
    },
    // GET /api/users/:id (Admin only)
    getById: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const user = await User_1.User.findById(id).lean();
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found.' });
                return;
            }
            const [userComplaints, assignedComplaints] = await Promise.all([
                Complaint_1.Complaint.find({ reportedById: id }).sort({ createdAt: -1 }).limit(50).lean(),
                Complaint_1.Complaint.find({ assignedToId: id }).sort({ createdAt: -1 }).limit(50).lean(),
            ]);
            const { password: _, ...userSafe } = user;
            res.json({
                success: true,
                user: {
                    ...userSafe,
                    id: user._id.toString(),
                    reportsCount: userComplaints.length,
                    assignedCount: assignedComplaints.length,
                },
                complaints: userComplaints,
                assignedComplaints,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving user details.' });
        }
    },
    // PUT /api/users/:id/ban (Admin only)
    toggleBan: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { isBanned, days, reason } = req.body;
            const user = await User_1.User.findById(id);
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found.' });
                return;
            }
            let bannedUntil = null;
            if (isBanned && days && typeof days === 'number') {
                bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            }
            user.isBanned = Boolean(isBanned);
            user.bannedUntil = bannedUntil;
            user.accountStatus = isBanned ? 'SUSPENDED' : 'ACTIVE';
            await user.save();
            res.json({
                success: true,
                message: isBanned
                    ? `User suspended ${days ? `for ${days} days` : 'permanently'}.`
                    : 'User suspension lifted.',
                user: user.toJSON(),
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error updating user status.' });
        }
    },
    // PUT /api/users/:id/fraud-score (Admin only - Account security calibration)
    updateFraudScore: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { fraudScore, reason } = req.body;
            const user = await User_1.User.findById(id);
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found.' });
                return;
            }
            user.fraudScore = Number(fraudScore) || 0;
            if (user.fraudScore > 80) {
                user.accountRiskLevel = 'CRITICAL';
                user.investigationStatus = 'FLAGGED';
            }
            else if (user.fraudScore > 40) {
                user.accountRiskLevel = 'HIGH';
                user.investigationStatus = 'UNDER_REVIEW';
            }
            else {
                user.accountRiskLevel = 'LOW';
                user.investigationStatus = 'CLEARED';
            }
            if (reason) {
                user.accountFraudFlags.push({
                    reason,
                    score: Number(fraudScore) || 0,
                    createdAt: new Date(),
                });
            }
            await user.save();
            res.json({
                success: true,
                message: `Account fraud score calibrated to ${user.fraudScore}.`,
                user: user.toJSON(),
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error updating fraud score.' });
        }
    },
    // DELETE /api/users/:id (Admin only - Explicit authorized Controller deletion)
    deleteUser: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const user = await User_1.User.findById(id);
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found.' });
                return;
            }
            if (user.role === 'ADMIN' && user.email === 'nowfal@gmail.com') {
                res.status(403).json({ success: false, message: 'The Chief Civic Controller account cannot be deleted.' });
                return;
            }
            await User_1.User.findByIdAndDelete(id);
            await OfficerRequest_1.OfficerRequest.deleteMany({ applicantId: id });
            res.json({
                success: true,
                message: `Account ${user.email} permanently removed by Controller.`,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error deleting user.' });
        }
    },
    // GET /api/users/suspicious (Admin only - ACCOUNT-level fraud signals only)
    getSuspicious: async (_req, res) => {
        try {
            await (0, db_1.connectDb)();
            // 1. Users with high fraud score or flagged
            const suspiciousUsers = await User_1.User.find({
                $or: [{ fraudScore: { $gt: 40 } }, { investigationStatus: 'FLAGGED' }, { isBanned: true }],
            })
                .sort({ fraudScore: -1 })
                .lean();
            // 2. Identify phone clustering (multiple accounts sharing same phone number)
            const phoneClusters = await User_1.User.aggregate([
                { $match: { phone: { $ne: null } } },
                { $group: { _id: '$phone', count: { $sum: 1 }, userIds: { $push: '$_id' } } },
                { $match: { count: { $gt: 1 } } },
            ]);
            const formatted = suspiciousUsers.map((u) => {
                const { password: _, ...userSafe } = u;
                return {
                    ...userSafe,
                    id: u._id.toString(),
                    isSharedPhoneRisk: phoneClusters.some((pc) => pc._id === u.phone),
                };
            });
            res.json({
                success: true,
                count: formatted.length,
                users: formatted,
                phoneClustersCount: phoneClusters.length,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error fetching suspicious accounts.' });
        }
    },
    // -------------------------------------------------------------
    // CONTROLLER REVIEWS: OFFICER APPROVALS (Pure MongoDB)
    // -------------------------------------------------------------
    getOfficerAccessRequests: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { status } = req.query;
            const filter = {};
            if (status && status !== 'ALL') {
                filter.status = status;
            }
            const requests = await OfficerRequest_1.OfficerRequest.find(filter).sort({ createdAt: -1 }).lean();
            res.json({
                success: true,
                count: requests.length,
                requests: requests.map((r) => ({
                    ...r,
                    id: r._id.toString(),
                })),
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving officer access requests.' });
        }
    },
    approveOfficerAccessRequest: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { notes } = req.body;
            // Find by request ID or linked user ID
            let request = await OfficerRequest_1.OfficerRequest.findById(id);
            let user = null;
            if (request) {
                user = await User_1.User.findOne({ email: request.email.toLowerCase().trim() });
            }
            else {
                user = await User_1.User.findById(id);
                if (user) {
                    request = await OfficerRequest_1.OfficerRequest.findOne({ email: user.email.toLowerCase().trim() });
                }
            }
            // If user does not exist in User collection yet, create them directly from the request
            if (!user && request) {
                const accountNumber = await (0, Counter_1.getNextAccountNumber)();
                const username = request.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 14) +
                    '_' +
                    Math.floor(100 + Math.random() * 900);
                user = new User_1.User({
                    accountNumber,
                    username,
                    name: request.name,
                    email: request.email.toLowerCase().trim(),
                    phone: request.phone,
                    role: 'OFFICER',
                    department: request.department,
                    designation: request.designation,
                    governmentIdProof: request.governmentIdProof,
                    location: request.district || 'Tamil Nadu',
                });
            }
            if (!user) {
                res.status(404).json({ success: false, message: 'Officer applicant not found.' });
                return;
            }
            // Generate a secure one-time temporary password (e.g. TNOfficer@xxxx)
            const rawTempPassword = `TNOfficer@${Math.floor(1000 + Math.random() * 9000)}`;
            const hashedTempPassword = await bcryptjs_1.default.hash(rawTempPassword, 10);
            // 1. Update Officer User in MongoDB
            user.role = 'OFFICER';
            if (request) {
                user.department = request.department || user.department;
                user.designation = request.designation || user.designation;
                user.governmentIdProof = request.governmentIdProof || user.governmentIdProof;
            }
            user.password = hashedTempPassword;
            user.approvalStatus = 'APPROVED';
            user.isApproved = true;
            user.accountStatus = 'ACTIVE';
            user.needsPasswordChange = true;
            user.approvedAt = new Date();
            user.approvedById = req.user?.id || null;
            user.decisionNotes = notes || 'Approved by Controller';
            await user.save();
            // 2. Mark ALL OfficerRequest records for this email as APPROVED in MongoDB
            await OfficerRequest_1.OfficerRequest.updateMany({ email: user.email.toLowerCase().trim() }, {
                status: 'APPROVED',
                reviewedBy: req.user?.id || null,
                reviewedAt: new Date(),
                decisionNotes: notes || 'Approved by Controller',
            });
            // 3. Send email with temporary login password
            await email_1.emailService.sendOfficerApprovalEmail(user.email, user.name || user.username, rawTempPassword, user.department || 'Civic Works').catch(() => { });
            console.log(`[OFFICER-ACTIVATED] Officer ${user.email} approved and activated in MongoDB.`);
            res.json({
                success: true,
                message: `Officer access approved. Temporary password has been dispatched to ${user.email}.`,
                tempPassword: rawTempPassword,
                approved: true,
                officer: user.toJSON(),
            });
        }
        catch (error) {
            console.error('Error approving officer request:', error);
            res.status(500).json({ success: false, message: 'Failed to approve officer request.' });
        }
    },
    rejectOfficerAccessRequest: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const { notes } = req.body;
            let request = await OfficerRequest_1.OfficerRequest.findById(id);
            let user = null;
            if (request) {
                user = await User_1.User.findOne({ email: request.email.toLowerCase().trim() });
            }
            else {
                user = await User_1.User.findById(id);
                if (user) {
                    request = await OfficerRequest_1.OfficerRequest.findOne({ email: user.email.toLowerCase().trim() });
                }
            }
            if (user) {
                user.approvalStatus = 'REJECTED';
                user.isApproved = false;
                user.accountStatus = 'DISABLED';
                user.decisionNotes = notes || 'Departmental roster verification rejected by Controller';
                await user.save();
            }
            if (request || user) {
                const targetEmail = (request?.email || user?.email || '').toLowerCase().trim();
                await OfficerRequest_1.OfficerRequest.updateMany({ email: targetEmail }, {
                    status: 'REJECTED',
                    reviewedBy: req.user?.id || null,
                    reviewedAt: new Date(),
                    decisionNotes: notes || 'Rejected by Controller',
                });
            }
            if (user) {
                await email_1.emailService.sendOfficerRejectionEmail(user.email, user.name || user.username, notes || 'Departmental roster verification rejected by Controller').catch(() => { });
            }
            res.json({
                success: true,
                message: 'Officer access application rejected.',
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to reject officer access request.' });
        }
    },
    // Officer Profile Change Requests
    getProfileChangeRequests: async (_req, res) => {
        res.json({ success: true, count: 0, requests: [] });
    },
    approveProfileChangeRequest: async (_req, res) => {
        res.json({ success: true, message: 'Profile request approved.' });
    },
    rejectProfileChangeRequest: async (_req, res) => {
        res.json({ success: true, message: 'Profile request rejected.' });
    },
};
