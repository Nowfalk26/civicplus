"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_1 = require("../controllers/users");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All user management routes require ADMIN privileges
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.getAll);
router.get('/suspicious', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.getSuspicious);
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.getById);
router.put('/:id/ban', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.toggleBan);
router.put('/:id/fraud-score', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.updateFraudScore);
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.deleteUser);
// Controller Officer Approvals
router.get('/admin/officer-requests', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.getOfficerAccessRequests);
router.post('/admin/officer-requests/:id/approve', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.approveOfficerAccessRequest);
router.post('/admin/officer-requests/:id/reject', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.rejectOfficerAccessRequest);
// Controller Profile Change Reviews
router.get('/admin/profile-change-requests', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.getProfileChangeRequests);
router.post('/admin/profile-change-requests/:id/approve', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.approveProfileChangeRequest);
router.post('/admin/profile-change-requests/:id/reject', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), users_1.userController.rejectProfileChangeRequest);
exports.default = router;
