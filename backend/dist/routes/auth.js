"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const auth_2 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
// Base Auth
router.post('/register', rateLimit_1.authRateLimiter, auth_1.authController.register);
router.post('/login', rateLimit_1.authRateLimiter, auth_1.authController.login);
router.post('/refresh', auth_1.authController.refresh);
router.post('/logout', auth_1.authController.logout);
router.delete('/account', auth_2.authenticate, auth_1.authController.deleteAccount); // Explicit user self-deletion
router.get('/me', auth_2.authenticate, auth_1.authController.getMe);
router.put('/me', auth_2.authenticate, auth_1.authController.updateMe);
// 1. Civic Authentication Routes
router.post('/civic/login', rateLimit_1.authRateLimiter, auth_1.authController.civicLogin);
router.post('/civic/google', rateLimit_1.authRateLimiter, auth_1.authController.civicGoogleLogin);
router.post('/civic/mobile/send-otp', rateLimit_1.authRateLimiter, auth_1.authController.civicSendOtp);
router.post('/civic/mobile/verify-otp', rateLimit_1.authRateLimiter, auth_1.authController.civicVerifyOtp);
// 2. Controller Authentication Route (Dedicated identity)
router.post('/controller/login', rateLimit_1.authRateLimiter, auth_1.authController.controllerLogin);
// 3. Officer Authentication & Request Routes
router.post('/officer/request-access', rateLimit_1.authRateLimiter, auth_1.authController.officerRequestAccess);
router.post('/officer/login', rateLimit_1.authRateLimiter, auth_1.authController.officerLogin);
router.post('/officer/google', rateLimit_1.authRateLimiter, auth_1.authController.officerGoogleLogin);
router.post('/officer/set-password', auth_2.authenticate, auth_1.authController.officerSetPassword);
// 4. Employee Authentication Route
router.post('/employee/login', rateLimit_1.authRateLimiter, auth_1.authController.employeeLogin);
router.post('/employee/change-password', auth_2.authenticate, auth_1.authController.employeeChangePassword);
// 5. Officer Profile Change Requests
router.post('/officer/profile-change-request', auth_2.authenticate, auth_1.authController.officerCreateProfileChangeRequest);
router.get('/officer/profile-change-requests', auth_2.authenticate, auth_1.authController.officerGetProfileChangeRequests);
// 6. Google OAuth Configuration endpoints
router.get('/google-config', auth_1.authController.getGoogleConfig);
router.post('/save-google-client-id', auth_1.authController.saveGoogleClientId);
exports.default = router;
