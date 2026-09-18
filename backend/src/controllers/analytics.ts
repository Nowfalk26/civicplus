import { Request, Response } from 'express';
import { inMemoryDb } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { TN_DISTRICTS } from '../data/seedData';

export const analyticsController = {
  // GET /api/analytics/stats
  getStats: async (_req: Request, res: Response): Promise<void> => {
    try {
      const complaints = inMemoryDb.complaints;
      const total = complaints.length;
      const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
      const pending = complaints.filter(
        (c) => c.status === 'SUBMITTED' || c.status === 'ACCEPTED' || c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS'
      ).length;
      const rejected = complaints.filter((c) => c.status === 'REJECTED').length;

      const flagged = complaints.filter((c) => c.fraudFlags.length > 0).length;
      const fraudRate = total > 0 ? Number(((flagged / total) * 100).toFixed(1)) : 0;
      const resolvedRate = total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0;

      // Category breakdown
      const categoryCounts: Record<string, number> = {};
      for (const c of complaints) {
        categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
      }

      // Status breakdown
      const statusCounts: Record<string, number> = {};
      for (const c of complaints) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      }

      // District breakdown
      const districtCounts: Record<string, { total: number; resolved: number }> = {};
      for (const district of TN_DISTRICTS) {
        districtCounts[district] = { total: 0, resolved: 0 };
      }
      for (const c of complaints) {
        for (const district of TN_DISTRICTS) {
          if (c.location.includes(district)) {
            districtCounts[district].total++;
            if (c.status === 'RESOLVED') districtCounts[district].resolved++;
            break;
          }
        }
      }

      // 7-day trend (received vs resolved)
      const trend7Days: { date: string; received: number; resolved: number }[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
        const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

        const receivedCount = complaints.filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t >= dayStart && t <= dayEnd;
        }).length;

        const resolvedCount = complaints.filter((c) => {
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

      const civicUsers = inMemoryDb.users.filter((u) => u.role === 'CITIZEN').length;
      const officerUsers = inMemoryDb.users.filter((u) => u.role === 'OFFICER' && !u.isBanned).length;
      const pendingOfficers = inMemoryDb.users.filter((u) => u.role === 'OFFICER' && u.isBanned).length;
      const totalUsers = civicUsers + officerUsers;
      const bannedUsers = inMemoryDb.users.filter((u) => u.isBanned && u.role === 'CITIZEN').length;
      const suspiciousAccounts = inMemoryDb.users.filter((u) => u.fraudScore > 50).length;

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
          totalUsers,
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
      const { name } = req.params;
      const complaints = inMemoryDb.complaints.filter((c) =>
        c.location.toLowerCase().includes(name.toLowerCase())
      );

      const total = complaints.length;
      const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
      const pending = complaints.filter(
        (c) => c.status === 'SUBMITTED' || c.status === 'ACCEPTED' || c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS'
      ).length;
      const officers = inMemoryDb.users.filter(
        (u) => u.role === 'OFFICER' && u.location.toLowerCase().includes(name.toLowerCase())
      );

      res.json({
        success: true,
        district: name,
        totalComplaints: total,
        resolvedComplaints: resolved,
        pendingComplaints: pending,
        resolutionPercentage: total > 0 ? Number(((resolved / total) * 100).toFixed(1)) : 0,
        activeOfficersCount: officers.length,
        officers: officers.map(({ password: _, ...off }) => off),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching district statistics.' });
    }
  },

  // GET /api/analytics/officer/:id
  getOfficerStats: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const officer = inMemoryDb.findUserById(id);

      if (!officer) {
        res.status(404).json({ success: false, message: 'Officer not found.' });
        return;
      }

      const assignedComplaints = inMemoryDb.complaints.filter((c) => c.assignedToId === id);
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

      const efficiencyRating = totalAssigned > 0
        ? `${((resolved / totalAssigned) * 5).toFixed(1)} / 5.0`
        : '0.0 / 5.0';

      res.json({
        success: true,
        officer: {
          id: officer.id,
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
          efficiencyRating,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving officer analytics.' });
    }
  },

  // GET /api/analytics/fraud-detection
  getFraudDetection: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const flaggedComplaints = inMemoryDb.complaints
        .filter((c) => c.fraudFlags.length > 0)
        .map((c) => {
          const reporter = inMemoryDb.findUserById(c.reportedById);
          const totalFraudScore = c.fraudFlags.reduce((acc, f) => acc + f.score, 0);
          return {
            ...c,
            totalFraudScore,
            reporter: reporter
              ? {
                  id: reporter.id,
                  username: reporter.username,
                  phone: reporter.phone,
                  fraudScore: reporter.fraudScore,
                  isBanned: reporter.isBanned,
                  bannedUntil: reporter.bannedUntil,
                }
              : null,
          };
        })
        .sort((a, b) => b.totalFraudScore - a.totalFraudScore);

      const suspiciousUsers = inMemoryDb.users
        .filter((u) => u.fraudScore > 50)
        .map(({ password: _, ...user }) => user);

      res.json({
        success: true,
        totalFlaggedComplaints: flaggedComplaints.length,
        suspiciousUsersCount: suspiciousUsers.length,
        flaggedComplaints,
        suspiciousUsers,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving fraud analytics.' });
    }
  },
};
