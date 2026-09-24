import { Router } from 'express';
import { employeeController } from '../controllers/employees';
import { authenticate, authorize } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

// Employee Self-Service Desk (also accessible by ADMIN / OFFICER for oversight and preview)
router.get('/my-reports', authenticate, authorize('EMPLOYEE', 'ADMIN', 'OFFICER'), employeeController.getMyReports);
router.post('/my-reports/:id/verify', authenticate, authorize('EMPLOYEE', 'ADMIN', 'OFFICER'), uploadMiddleware.single('photo'), employeeController.verifyAssignedReport);

// Officer & Controller Management
router.get('/', authenticate, authorize('OFFICER', 'ADMIN'), employeeController.getAll);
router.post('/', authenticate, authorize('OFFICER', 'ADMIN'), employeeController.create);
router.put('/:id', authenticate, authorize('OFFICER', 'ADMIN'), employeeController.update);
router.put('/:id/status', authenticate, authorize('OFFICER', 'ADMIN'), employeeController.toggleStatus);
router.post('/:id/reset-password', authenticate, authorize('OFFICER', 'ADMIN'), employeeController.resetPassword);
router.get('/workload', authenticate, authorize('OFFICER', 'ADMIN'), employeeController.getWorkload);

export default router;
