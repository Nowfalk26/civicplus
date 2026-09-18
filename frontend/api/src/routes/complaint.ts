import { Router } from 'express';
import { complaintController } from '../controllers/complaints';
import { authenticate, authorize } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

// Read operations - accessible to authenticated users
router.get('/', authenticate, complaintController.getAll);
router.get('/nearby', authenticate, complaintController.getNearby);
router.get('/user/:userId', authenticate, complaintController.getByUser);
router.get('/:id', authenticate, complaintController.getById);

// Create complaint - citizen role, accepts up to 5 photos
router.post(
  '/',
  authenticate,
  authorize('CITIZEN', 'ADMIN'),
  uploadMiddleware.array('photos', 5),
  complaintController.create
);

// Update complaint details - officer and admin
router.put(
  '/:id',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.update
);

// Delete complaint - admin only
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  complaintController.delete
);

// Workflow actions
router.post(
  '/:id/assign',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.assign
);

router.post(
  '/:id/status',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  complaintController.updateStatus
);

router.post(
  '/:id/photo',
  authenticate,
  uploadMiddleware.single('photo'),
  complaintController.uploadPhoto
);

export default router;
