"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaints_1 = require("../controllers/complaints");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Read operations - accessible to authenticated users
router.get('/', auth_1.authenticate, complaints_1.complaintController.getAll);
router.get('/nearby', auth_1.authenticate, complaints_1.complaintController.getNearby);
router.get('/user/:userId', auth_1.authenticate, complaints_1.complaintController.getByUser);
router.get('/:id', auth_1.authenticate, complaints_1.complaintController.getById);
// Create complaint - citizen role, accepts up to 5 photos
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('CITIZEN', 'ADMIN'), upload_1.uploadMiddleware.array('photos', 5), complaints_1.complaintController.create);
// Delete complaint - admin only
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), complaints_1.complaintController.delete);
// Workflow actions (Status update)
router.post('/:id/status', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), complaints_1.complaintController.updateStatus);
// Employee Assignment actions
router.post('/:id/assign-employee', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), complaints_1.complaintController.assignEmployee);
router.get('/:id/assignment-history', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), complaints_1.complaintController.getAssignmentHistory);
// Officer Report Verification Desk
router.post('/:id/verify', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), complaints_1.complaintController.verifyReport);
exports.default = router;
