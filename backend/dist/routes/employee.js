"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employees_1 = require("../controllers/employees");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Employee Self-Service Desk
router.get('/my-reports', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYEE'), employees_1.employeeController.getMyReports);
router.post('/my-reports/:id/verify', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYEE'), upload_1.uploadMiddleware.single('photo'), employees_1.employeeController.verifyAssignedReport);
// Officer & Controller Management
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), employees_1.employeeController.getAll);
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), employees_1.employeeController.create);
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), employees_1.employeeController.update);
router.put('/:id/status', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), employees_1.employeeController.toggleStatus);
router.post('/:id/reset-password', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), employees_1.employeeController.resetPassword);
router.get('/workload', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), employees_1.employeeController.getWorkload);
exports.default = router;
