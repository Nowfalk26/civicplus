import { Request, Response } from 'express';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { connectDb } from '../lib/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { TN_DISTRICTS } from '../data/seedData';

export const analyticsController = {
  // GET /api/analytics/stats
  getStats: async (_req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();

      const [
        total,
        resolved,
        pending,
        rejected,
        civicUsers,
        officerUsers,
        pendingOfficers,
        bannedUsers,
        suspiciousAccounts,
        allComplaints,
      ] = await Promise.all([
        Complaint.countDocuments(),
        Complaint.countDocuments({ status: 'RESOLVED' }),
        Complaint.countDocuments({
          status: { $in: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
        }),
        Complaint.countDocuments({ status: 'REJECTED' }),
        User.countDocuments({ role: 'CITIZEN' }),
        User.countDocuments({ role: 'OFFICER', isApproved: true }),
        User.countDocuments({ role: 'OFFICER', approvalStatus: 'PENDING' }),
        User.countDocuments({ isBanned: true }),
        User.countDocuments({ fraudScore: { $gt: 40 } }),
        Complaint.find({}, 'category status location createdAt resolvedAt fraudFlags').lean(),
      ]);

      const flagged = allComplaints.filter((c) => c.fraudFlags && c.fraudFlags.length > 0).length;
      const fraudRate = total > 0 ? Number(((flagged / total) * 100).toFixed(1)) : 0;
      const resolvedRate = total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0;

      // Category counts
      const categoryCounts: Record<string, number> = {};
      for (const c of allComplaints) {
        categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
      }

      // Status counts
      const statusCounts: Record<string, number> = {};
      for (const c of allComplaints) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      }

      // District counts
      const districtCounts: Record<string, { total: number; resolved: number }> = {};
      for (const district of TN_DISTRICTS) {
        districtCounts[district] = { total: 0, resolved: 0 };
      }
      for (const c of allComplaints) {
        for (const district of TN_DISTRICTS) {
          if (c.location.includes(district)) {
            districtCounts[district].total++;
            if (c.status === 'RESOLVED') districtCounts[district].resolved++;
            break;
          }
        }
      }

      // 7-day trend
      const trend7Days: { date: string; received: number; resolved: number }[] = [];
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
          if (!c.resolvedAt) return false;
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
    } catch (error: any) {
      console.error('getStats error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate platform statistics.' });
    }
  },

  // GET /api/analytics/district/:name
  getDistrictStats: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { name } = req.params;

      const [total, resolved, pending, officers] = await Promise.all([
        Complaint.countDocuments({ location: { $regex: name, $options: 'i' } }),
        Complaint.countDocuments({ location: { $regex: name, $options: 'i' }, status: 'RESOLVED' }),
        Complaint.countDocuments({
          location: { $regex: name, $options: 'i' },
          status: { $in: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS'] },
        }),
        User.find({ role: 'OFFICER', location: { $regex: name, $options: 'i' } })
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
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching district statistics.' });
    }
  },

  // GET /api/analytics/officer/:id
  getOfficerStats: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { id } = req.params;
      const officer = await User.findById(id).select('-password').lean();

      if (!officer) {
        res.status(404).json({ success: false, message: 'Officer not found.' });
        return;
      }

      const assignedComplaints = await Complaint.find({ assignedToId: id }).lean();
      const totalAssigned = assignedComplaints.length;
      const resolved = assignedComplaints.filter((c) => c.status === 'RESOLVED').length;
      const inProgress = assignedComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
      const pending = assignedComplaints.filter((c) => c.status === 'ASSIGNED').length;

      const resolutionRate =
        totalAssigned > 0 ? Number(((resolved / totalAssigned) * 100).toFixed(1)) : 0;

      const resolvedComplaints = assignedComplaints.filter((c) => c.status === 'RESOLVED' && c.resolvedAt);
      let avgResolutionHours = 0;
      if (resolvedComplaints.length > 0) {
        const totalDuration = resolvedComplaints.reduce((acc, c) => {
          const diff = new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime();
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
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving officer analytics.' });
    }
  },

  // GET /api/analytics/fraud-detection (Account security & anomaly flags)
  getFraudDetection: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();

      // Account-level security signals
      const [suspiciousUsers, flaggedComplaints] = await Promise.all([
        User.find({
          $or: [{ fraudScore: { $gt: 40 } }, { investigationStatus: 'FLAGGED' }, { isBanned: true }],
        })
          .select('-password')
          .sort({ fraudScore: -1 })
          .lean(),
        Complaint.find({ 'fraudFlags.0': { $exists: true } })
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
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving fraud analytics.' });
    }
  },
};
