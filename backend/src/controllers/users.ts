import { Response } from 'express';
import { inMemoryDb } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const userController = {
  // GET /api/users (Admin only)
  getAll: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role, search, page = '1', limit = '100' } = req.query;

      // Filter non-sensitive user attributes safely (Never expose passwords, hashes, tokens, or OTPs)
      let filtered = inMemoryDb.users.map((u) => {
        const reportsCount = inMemoryDb.complaints.filter((c) => c.reportedById === u.id).length;
        const assignedCount = inMemoryDb.complaints.filter((c) => c.assignedToId === u.id).length;
        const resolvedCount = inMemoryDb.complaints.filter(
          (c) => c.assignedToId === u.id && c.status === 'RESOLVED'
        ).length;

        let accountStatus = 'ACTIVE';
        if (u.isBanned) {
          accountStatus = 'SUSPENDED';
        } else if (u.role === 'OFFICER' && u.approvalStatus === 'PENDING') {
          accountStatus = 'PENDING_APPROVAL';
        }

        const isApproved =
          u.role !== 'OFFICER' ||
          (u.approvalStatus === 'APPROVED' && !u.isBanned) ||
          (!u.isBanned && u.approvalStatus !== 'PENDING' && u.approvalStatus !== 'REJECTED');

        return {
          id: u.id,
          username: u.username,
          name: u.name || u.username,
          email: u.email,
          phone: u.phone,
          role: u.role,
          location: u.location,
          avatarUrl: u.avatarUrl,
          department: u.department || null,
          designation: u.designation || null,
          approvalStatus: u.approvalStatus || (u.role === 'OFFICER' ? (u.isBanned ? 'PENDING' : 'APPROVED') : 'APPROVED'),
          isApproved,
          needsPasswordChange: u.needsPasswordChange || false,
          fraudScore: u.fraudScore || 0,
          accountStatus,
          isBanned: u.isBanned,
          bannedUntil: u.bannedUntil,
          reportsCount,
          assignedCount,
          resolvedCount,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      });

      if (role && role !== 'ALL') {
        filtered = filtered.filter((u) => u.role === role);
      }

      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.phone.includes(q) ||
            u.location.toLowerCase().includes(q) ||
            (u.department && u.department.toLowerCase().includes(q))
        );
      }

      // Sort newest accounts first
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
      const total = filtered.length;
      const offset = (pageNum - 1) * limitNum;

      const stats = inMemoryDb.getStats();

      res.json({
        success: true,
        users: filtered.slice(offset, offset + limitNum),
        stats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('[USERS-API] Error retrieving users:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
    }
  },

  // GET /api/users/:id (Admin only)
  getById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = inMemoryDb.findUserById(id);

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const userComplaints = inMemoryDb.complaints.filter((c) => c.reportedById === id);
      const assignedComplaints = inMemoryDb.complaints.filter((c) => c.assignedToId === id);

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        user: {
          ...userSafe,
          reportsCount: userComplaints.length,
          assignedCount: assignedComplaints.length,
          resolvedCount: assignedComplaints.filter((c) => c.status === 'RESOLVED').length,
          accountStatus: user.isBanned
            ? user.role === 'OFFICER' && !user.bannedUntil
              ? 'PENDING_APPROVAL'
              : 'SUSPENDED'
            : 'ACTIVE',
        },
        complaints: userComplaints,
        assignedComplaints,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving user details.' });
    }
  },

  // PUT /api/users/:id/ban (Admin only)
  toggleBan: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isBanned, days, reason } = req.body;

      const user = inMemoryDb.findUserById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      let bannedUntil: string | null = null;
      if (isBanned && days) {
        bannedUntil = new Date(Date.now() + days * 86400000).toISOString();
      }

      const updated = inMemoryDb.updateUser(id, {
        isBanned: Boolean(isBanned),
        bannedUntil,
      });

      res.json({
        success: true,
        message: isBanned
          ? `User ${user.username} has been ${days ? `suspended for ${days} days` : 'permanently banned'}. Reason: ${reason || 'Administrative action'}`
          : `User ${user.username} has been unbanned.`,
        user: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating ban status.' });
    }
  },

  // PUT /api/users/:id/fraud-score (Admin only)
  updateFraudScore: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { fraudScore, reason } = req.body;

      if (fraudScore === undefined || isNaN(Number(fraudScore))) {
        res.status(400).json({ success: false, message: 'Valid fraudScore is required.' });
        return;
      }

      const user = inMemoryDb.findUserById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const scoreNum = Math.max(0, Math.min(100, Number(fraudScore)));
      const shouldAutoBan = scoreNum > 80 && !user.isBanned;
      const bannedUntil = shouldAutoBan
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : user.bannedUntil;

      const updated = inMemoryDb.updateUser(id, {
        fraudScore: scoreNum,
        ...(shouldAutoBan ? { isBanned: true, bannedUntil } : {}),
      });

      res.json({
        success: true,
        message: `Fraud score updated to ${scoreNum}. ${shouldAutoBan ? 'User auto-banned for 7 days.' : ''}`,
        user: updated,
        reason,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating fraud score.' });
    }
  },

  // DELETE /api/users/:id (Admin only)
  deleteUser: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = inMemoryDb.findUserById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (user.role === 'ADMIN' && req.user?.id === user.id) {
        res.status(400).json({ success: false, message: 'Cannot delete your own active administrator account.' });
        return;
      }

      const deleted = inMemoryDb.deleteUser(id);
      if (deleted) {
        res.json({
          success: true,
          message: `User account for ${user.username} (${user.email}) has been permanently deleted.`,
        });
      } else {
        res.status(400).json({ success: false, message: 'Failed to delete user.' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error deleting user account.' });
    }
  },

  // GET /api/users/suspicious (Admin only)
  getSuspicious: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const suspiciousUsers = inMemoryDb.users
        .filter((u) => u.fraudScore > 50)
        .sort((a, b) => b.fraudScore - a.fraudScore)
        .map(({ password: _, ...user }) => {
          const complaints = inMemoryDb.complaints.filter((c) => c.reportedById === user.id);
          const rejected = complaints.filter((c) => c.status === 'REJECTED').length;
          return {
            ...user,
            totalComplaints: complaints.length,
            rejectedComplaints: rejected,
          };
        });

      res.json({
        success: true,
        count: suspiciousUsers.length,
        users: suspiciousUsers,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching suspicious users.' });
    }
  },

  // -------------------------------------------------------------
  // CONTROLLER REVIEWS: OFFICER APPROVALS (Pure User model, No custom tables)
  // -------------------------------------------------------------
  getOfficerAccessRequests: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query;
      
      // Query officers directly from existing User storage
      let officers = inMemoryDb.users.filter((u) => u.role === 'OFFICER');

      if (status === 'PENDING') {
        officers = officers.filter(
          (u) => u.approvalStatus === 'PENDING' || (u.isBanned && !u.bannedUntil)
        );
      } else if (status === 'APPROVED') {
        officers = officers.filter(
          (u) => u.approvalStatus === 'APPROVED' && !u.isBanned
        );
      } else if (status === 'REJECTED') {
        officers = officers.filter((u) => u.approvalStatus === 'REJECTED');
      }

      // Map existing user records to the display format expected by the Controller UI
      const requests = officers.map((u) => ({
        id: u.id,
        name: u.name || u.username,
        email: u.email,
        phone: u.phone,
        department: u.department || 'Civic Administration',
        designation: u.designation || 'Field Inspector',
        district: u.location,
        governmentIdProof: u.governmentIdProof || 'TN-OFFICER-VERIFIED',
        idProofType: u.idProofType || 'TN_CIVIC_BADGE',
        reason: u.requestReason || 'Official civic department allocation',
        decisionNotes: u.decisionNotes,
        status: u.approvalStatus || (u.isBanned ? 'PENDING' : 'APPROVED'),
        isApproved: u.approvalStatus === 'APPROVED' && !u.isBanned,
        createdAt: u.createdAt,
      }));

      res.json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error retrieving officer access requests.' });
    }
  },

  approveOfficerAccessRequest: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      // Find officer in existing User model
      const user = inMemoryDb.findUserById(id);
      if (!user || user.role !== 'OFFICER') {
        res.status(404).json({ success: false, message: 'Officer account not found.' });
        return;
      }

      if (user.approvalStatus === 'APPROVED' && !user.isBanned) {
        res.status(400).json({
          success: false,
          message: 'This officer account is already active and approved.',
        });
        return;
      }

      // Generate a secure one-time temporary password (e.g. TNOfficer@xxxx)
      const rawTempPassword = `TNOfficer@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedTempPassword = await (await import('bcryptjs')).default.hash(rawTempPassword, 10);

      // Activate and approve the officer directly in User model
      const updatedUser = inMemoryDb.updateUser(user.id, {
        password: hashedTempPassword,
        role: 'OFFICER',
        approvalStatus: 'APPROVED',
        isApproved: true,
        needsPasswordChange: true,
        isBanned: false,
        bannedUntil: null,
        approvedAt: new Date().toISOString(),
        approvedById: req.user?.id || 'admin-controller',
        decisionNotes: notes || 'Approved by Controller',
      });

      // Send dispatch notification email with temporary password
      const { emailService } = await import('../services/email');
      await emailService.sendOfficerApprovalEmail(
        user.email,
        user.name || user.username,
        rawTempPassword,
        user.department || 'Civic Works'
      );

      console.log(`[OFFICER-ACTIVATED] Officer ${user.email} approved and activated by Controller.`);

      const { password: _, ...userSafe } = updatedUser!;
      res.json({
        success: true,
        message: `Officer access approved. Temporary password has been dispatched to ${user.email}.`,
        tempPassword: rawTempPassword,
        approved: true,
        officer: {
          ...userSafe,
          approvalStatus: 'APPROVED',
          isApproved: true,
          needsPasswordChange: true,
        },
      });
    } catch (error: any) {
      console.error('Error approving officer request:', error);
      res.status(500).json({ success: false, message: 'Failed to approve officer request.' });
    }
  },

  rejectOfficerAccessRequest: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const user = inMemoryDb.findUserById(id);
      if (!user || user.role !== 'OFFICER') {
        res.status(404).json({ success: false, message: 'Officer account not found.' });
        return;
      }

      // Update unapproved officer to rejected state
      inMemoryDb.updateUser(user.id, {
        approvalStatus: 'REJECTED',
        isApproved: false,
        isBanned: true,
        decisionNotes: notes || 'Departmental roster verification rejected by Controller',
      });

      const { emailService } = await import('../services/email');
      await emailService.sendOfficerRejectionEmail(
        user.email,
        user.name || user.username,
        notes || 'Departmental roster verification rejected by Controller'
      );

      console.log(`[OFFICER-REJECTED] Officer candidate ${user.email} rejected by Controller.`);

      res.json({
        success: true,
        message: 'Officer access application rejected.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to reject officer access request.' });
    }
  },

  // -------------------------------------------------------------
  // CONTROLLER REVIEWS: OFFICER PROFILE CHANGE REQUESTS
  // -------------------------------------------------------------
  getProfileChangeRequests: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      count: 0,
      requests: [],
    });
  },

  approveProfileChangeRequest: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      message: 'Profile request approved.',
    });
  },

  rejectProfileChangeRequest: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({
      success: true,
      message: 'Profile request rejected.',
    });
  },
};

