import { Router } from 'express';
import { authController } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Base Auth
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.delete('/account', authenticate, authController.deleteAccount); // Explicit user self-deletion
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);

// 1. Civic Authentication Routes
router.post('/civic/login', authRateLimiter, authController.civicLogin);
router.post('/civic/google', authRateLimiter, authController.civicGoogleLogin);
router.post('/civic/mobile/send-otp', authRateLimiter, authController.civicSendOtp);
router.post('/civic/mobile/verify-otp', authRateLimiter, authController.civicVerifyOtp);

// 2. Controller Authentication Route (Dedicated identity)
router.post('/controller/login', authRateLimiter, authController.controllerLogin);

// 3. Officer Authentication & Request Routes
router.post('/officer/request-access', authRateLimiter, authController.officerRequestAccess);
router.post('/officer/login', authRateLimiter, authController.officerLogin);
router.post('/officer/google', authRateLimiter, authController.officerGoogleLogin);
router.post('/officer/set-password', authenticate, authController.officerSetPassword);

// 4. Employee Authentication Route
router.post('/employee/login', authRateLimiter, authController.employeeLogin);
router.post('/employee/change-password', authenticate, authController.employeeChangePassword);

// 5. Officer Profile Change Requests
router.post('/officer/profile-change-request', authenticate, authController.officerCreateProfileChangeRequest);
router.get('/officer/profile-change-requests', authenticate, authController.officerGetProfileChangeRequests);

// 6. Google OAuth Configuration endpoints
router.get('/google-config', authController.getGoogleConfig);
router.post('/save-google-client-id', authController.saveGoogleClientId);

export default router;
