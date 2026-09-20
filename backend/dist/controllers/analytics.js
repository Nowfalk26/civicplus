"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = void 0;
const Complaint_1 = require("../models/Complaint");
const User_1 = require("../models/User");
const db_1 = require("../lib/db");
const seedData_1 = require("../data/seedData");
exports.analyticsController = {
    // GET /api/analytics/stats
    getStats: async (_req, res) => {
        try {
            await (0, db_1.connectDb)();
            const [total, resolved, pending, rejected, civicUsers, officerUsers, pendingOfficers, bannedUsers, suspiciousAccounts, allComplaints,] = await Promise.all([
                Complaint_1.Complaint.countDocuments(),
                Complaint_1.Complaint.countDocuments({ status: 'RESOLVED' }),
                Complaint_1.Complaint.countDocuments({
                    status: { $in: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
                }),
                Complaint_1.Complaint.countDocuments({ status: 'REJECTED' }),
                User_1.User.countDocuments({ role: 'CITIZEN' }),
                User_1.User.countDocuments({ role: 'OFFICER', isApproved: true }),
                User_1.User.countDocuments({ role: 'OFFICER', approvalStatus: 'PENDING' }),
                User_1.User.countDocuments({ isBanned: true }),
                User_1.User.countDocuments({ fraudScore: { $gt: 40 } }),
                Complaint_1.Complaint.find({}, 'category status location createdAt resolvedAt fraudFlags').lean(),
            ]);
            const flagged = allComplaints.filter((c) => c.fraudFlags && c.fraudFlags.length > 0).length;
            const fraudRate = total > 0 ? Number(((flagged / total) * 100).toFixed(1)) : 0;
            const resolvedRate = total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0;
            // Category counts
            const categoryCounts = {};
            for (const c of allComplaints) {
                categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
            }
            // Status counts
            const statusCounts = {};
            for (const c of allComplaints) {
                statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
            }
            // District counts
            const districtCounts = {};
            for (const district of seedData_1.TN_DISTRICTS) {
                districtCounts[district] = { total: 0, resolved: 0 };
            }
            for (const c of allComplaints) {
                for (const district of seedData_1.TN_DISTRICTS) {
                    if (c.location.includes(district)) {
                        districtCounts[district].total++;
                        if (c.status === 'RESOLVED')
                            districtCounts[district].resolved++;
                        break;
                    }
                }
            }
            // 7-day trend
            const trend7Days = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 86400000);
                const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
                const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();
                const receivedCount = allComplaints.filter((c) => {
                    const t = new Date(c.createdAt).getTime();
                    return t >= dayStart && t <= dayEnd;
                }).length;
                const resolvedCount = allComplaints.filter((c) => {
                    if (!c.resolvedAt)
                        return false;
                    const t = new Date(c.resolvedAt).getTime();
                    return t >= dayStart && t <= dayEnd;
                }).length;
                trend7Days.push({
                    date: dateStr,
                    received: receivedCount,
                    resolved: resolvedCount,
                });
            }
            res.json({
                success: true,
                stats: {
                    totalComplaints: total,
                    resolvedComplaints: resolved,
                    pendingComplaints: pending,
                    rejectedComplaints: rejected,
                    resolvedRate,
                    fraudRate,
                    flaggedComplaints: flagged,
                    totalUsers: civicUsers + officerUsers,
                    civicUsers,
                    officerUsers,
                    pendingOfficers,
                    bannedUsers,
                    suspiciousAccounts,
                    categoryCounts,
                    statusCounts,
                    districtCounts,
                    trend7Days,
                },
            });
        }
        catch (error) {
            console.error('getStats error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate platform statistics.' });
        }
    },
    // GET /api/analytics/district/:name
    getDistrictStats: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { name } = req.params;
            const [total, resolved, pending, officers] = await Promise.all([
                Complaint_1.Complaint.countDocuments({ location: { $regex: name, $options: 'i' } }),
                Complaint_1.Complaint.countDocuments({ location: { $regex: name, $options: 'i' }, status: 'RESOLVED' }),
                Complaint_1.Complaint.countDocuments({
                    location: { $regex: name, $options: 'i' },
                    status: { $in: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
                }),
                User_1.User.find({ role: 'OFFICER', location: { $regex: name, $options: 'i' } })
                    .select('-password')
                    .lean(),
            ]);
            res.json({
                success: true,
                district: name,
                totalComplaints: total,
                resolvedComplaints: resolved,
                pendingComplaints: pending,
                resolutionPercentage: total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0,
                activeOfficersCount: officers.length,
                officers,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error fetching district statistics.' });
        }
    },
    // GET /api/analytics/officer/:id
    getOfficerStats: async (req, res) => {
        try {
            await (0, db_1.connectDb)();
            const { id } = req.params;
            const officer = await User_1.User.findById(id).select('-password').lean();
            if (!officer) {
                res.status(404).json({ success: false, message: 'Officer not found.' });
                return;
            }
            const assignedComplaints = await Complaint_1.Complaint.find({ assignedToId: id }).lean();
            const totalAssigned = assignedComplaints.length;
            const resolved = assignedComplaints.filter((c) => c.status === 'RESOLVED').length;
            const inProgress = assignedComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
            const pending = assignedComplaints.filter((c) => c.status === 'ASSIGNED').length;
            const resolutionRate = totalAssigned > 0 ? Number(((resolved / totalAssigned) * 100).toFixed(1)) : 0;
            const resolvedComplaints = assignedComplaints.filter((c) => c.status === 'RESOLVED' && c.resolvedAt);
            let avgResolutionHours = 0;
            if (resolvedComplaints.length > 0) {
                const totalDuration = resolvedComplaints.reduce((acc, c) => {
                    const diff = new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime();
                    return acc + diff / (1000 * 60 * 60);
                }, 0);
                avgResolutionHours = Number((totalDuration / resolvedComplaints.length).toFixed(1));
            }
            res.json({
                success: true,
                officer: {
                    id: officer._id.toString(),
                    username: officer.username,
                    location: officer.location,
                    avatarUrl: officer.avatarUrl,
                },
                metrics: {
                    totalAssigned,
                    resolved,
                    inProgress,
                    pending,
                    resolutionRate,
                    avgResolutionHours,
                    efficiencyRating: `${totalAssigned > 0 ? ((resolved / totalAssigned) * 5).toFixed(1) : '0.0'} / 5.0`,
                },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving officer analytics.' });
        }
    },
    // GET /api/analytics/fraud-detection (Account security & anomaly flags)
    getFraudDetection: async (_req, res) => {
        try {
            await (0, db_1.connectDb)();
            // Account-level security signals
            const [suspiciousUsers, flaggedComplaints] = await Promise.all([
                User_1.User.find({
                    $or: [{ fraudScore: { $gt: 40 } }, { investigationStatus: 'FLAGGED' }, { isBanned: true }],
                })
                    .select('-password')
                    .sort({ fraudScore: -1 })
                    .lean(),
                Complaint_1.Complaint.find({ 'fraudFlags.0': { $exists: true } })
                    .populate('reportedById', 'name username phone fraudScore isBanned accountNumber')
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean(),
            ]);
            res.json({
                success: true,
                totalFlaggedComplaints: flaggedComplaints.length,
                suspiciousUsersCount: suspiciousUsers.length,
                flaggedComplaints: flaggedComplaints.map((c) => ({
                    ...c,
                    id: c._id.toString(),
                })),
                suspiciousUsers: suspiciousUsers.map((u) => ({
                    ...u,
                    id: u._id.toString(),
                })),
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error retrieving fraud analytics.' });
        }
    },
};
