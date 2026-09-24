"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaints_1 = require("../controllers/complaints");
const workTracking_1 = require("../controllers/workTracking");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Read operations - public viewing with optional authentication
router.get('/', auth_1.optionalAuthenticate, complaints_1.complaintController.getAll);
router.get('/nearby', auth_1.optionalAuthenticate, complaints_1.complaintController.getNearby);
router.get('/user/:userId', auth_1.optionalAuthenticate, complaints_1.complaintController.getByUser);
router.get('/:id', auth_1.optionalAuthenticate, complaints_1.complaintController.getById);
// AI Vision Image Validation endpoint
router.post('/validate-image', complaints_1.complaintController.validateImage);
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
// ── Work Tracking endpoints ──────────────────────────────────────────
// Citizen / Employee / Officer: comprehensive tracking data
router.get('/:id/tracking', auth_1.authenticate, workTracking_1.workTrackingController.getComplaintTracking);
// Officer / Admin: full audit event trail
router.get('/:id/events', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), workTracking_1.workTrackingController.getComplaintEvents);
// Authenticated users: evidence photos
router.get('/:id/evidence', auth_1.authenticate, workTracking_1.workTrackingController.getComplaintEvidence);
// Employee: acknowledge / view complaint
router.post('/:id/acknowledge', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYEE'), workTracking_1.workTrackingController.acknowledgeComplaint);
// Employee: record site visit with photo
router.post('/:id/site-visit', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYEE'), upload_1.uploadMiddleware.single('photo'), workTracking_1.workTrackingController.completeSiteVisit);
// Employee: start work with photo
router.post('/:id/start-work', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYEE'), upload_1.uploadMiddleware.single('photo'), workTracking_1.workTrackingController.startWork);
// Employee: complete work with photo
router.post('/:id/complete-work', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYEE'), upload_1.uploadMiddleware.single('photo'), workTracking_1.workTrackingController.completeWork);
exports.default = router;
