import { Router } from 'express';
import { complaintController } from '../controllers/complaints';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

// Read operations - public viewing with optional authentication
router.get('/', optionalAuthenticate, complaintController.getAll);
router.get('/nearby', optionalAuthenticate, complaintController.getNearby);
router.get('/user/:userId', optionalAuthenticate, complaintController.getByUser);
router.get('/:id', optionalAuthenticate, complaintController.getById);

// AI Vision Image Validation endpoint
router.post('/validate-image', complaintController.validateImage);

// Create complaint - citizen role, accepts up to 5 photos
router.post(
  '/',
  authenticate,
  authorize('CITIZEN', 'ADMIN'),
  uploadMiddleware.array('photos', 5),
  complaintController.create
);

// Delete complaint - admin only
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  complaintController.delete
);

// Workflow actions (Status update)
router.post(
  '/:id/status',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.updateStatus
);

// Employee Assignment actions
router.post(
  '/:id/assign-employee',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.assignEmployee
);

router.get(
  '/:id/assignment-history',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.getAssignmentHistory
);

// Officer Report Verification Desk
router.post(
  '/:id/verify',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.verifyReport
);

export default router;
