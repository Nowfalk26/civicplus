import { Router } from 'express';
import { analyticsController } from '../controllers/analytics';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public / Citizen platform stats
router.get('/stats', analyticsController.getStats);
router.get('/district/:name', analyticsController.getDistrictStats);

// Officer analytics
router.get(
  '/officer/:id',
  authenticate,
  authorize('OFFICER', 'ADMIN'),
  analyticsController.getOfficerStats
);

// Admin fraud analytics
router.get(
  '/fraud-detection',
  authenticate,
  authorize('ADMIN'),
  analyticsController.getFraudDetection
);

export default router;
