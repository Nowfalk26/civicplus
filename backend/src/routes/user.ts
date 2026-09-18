import { Router } from 'express';
import { userController } from '../controllers/users';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All user management routes require ADMIN privileges
router.get('/', authenticate, authorize('ADMIN'), userController.getAll);
router.get('/suspicious', authenticate, authorize('ADMIN'), userController.getSuspicious);
router.get('/:id', authenticate, authorize('ADMIN'), userController.getById);
router.put('/:id/ban', authenticate, authorize('ADMIN'), userController.toggleBan);
router.put('/:id/fraud-score', authenticate, authorize('ADMIN'), userController.updateFraudScore);

// Controller Officer Approvals
router.get('/admin/officer-requests', authenticate, authorize('ADMIN'), userController.getOfficerAccessRequests);
router.post('/admin/officer-requests/:id/approve', authenticate, authorize('ADMIN'), userController.approveOfficerAccessRequest);
router.post('/admin/officer-requests/:id/reject', authenticate, authorize('ADMIN'), userController.rejectOfficerAccessRequest);

// Controller Profile Change Reviews
router.get('/admin/profile-change-requests', authenticate, authorize('ADMIN'), userController.getProfileChangeRequests);
router.post('/admin/profile-change-requests/:id/approve', authenticate, authorize('ADMIN'), userController.approveProfileChangeRequest);
router.post('/admin/profile-change-requests/:id/reject', authenticate, authorize('ADMIN'), userController.rejectProfileChangeRequest);

export default router;

