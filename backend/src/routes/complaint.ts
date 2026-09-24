import { Router } from 'express';
import { complaintController } from '../controllers/complaints';
import { workTrackingController } from '../controllers/workTracking';
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

// ── Work Tracking endpoints ──────────────────────────────────────────

// Citizen / Employee / Officer: comprehensive tracking data
router.get(
  '/:id/tracking',
  authenticate,
  workTrackingController.getComplaintTracking
);

// Officer / Admin: full audit event trail
router.get(
  '/:id/events',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  workTrackingController.getComplaintEvents
);

// Authenticated users: evidence photos
router.get(
  '/:id/evidence',
  authenticate,
  workTrackingController.getComplaintEvidence
);

// Employee: acknowledge / view complaint
router.post(
  '/:id/acknowledge',
  authenticate,
  authorize('EMPLOYEE'),
  workTrackingController.acknowledgeComplaint
);

// Employee: record site visit with photo
router.post(
  '/:id/site-visit',
  authenticate,
  authorize('EMPLOYEE'),
  uploadMiddleware.single('photo'),
  workTrackingController.completeSiteVisit
);

// Employee: start work with photo
router.post(
  '/:id/start-work',
  authenticate,
  authorize('EMPLOYEE'),
  uploadMiddleware.single('photo'),
  workTrackingController.startWork
);

// Employee: complete work with photo
router.post(
  '/:id/complete-work',
  authenticate,
  authorize('EMPLOYEE'),
  uploadMiddleware.single('photo'),
  workTrackingController.completeWork
);

export default router;

