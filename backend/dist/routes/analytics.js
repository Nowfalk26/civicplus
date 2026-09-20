"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_1 = require("../controllers/analytics");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public / Citizen platform stats
router.get('/stats', analytics_1.analyticsController.getStats);
router.get('/district/:name', analytics_1.analyticsController.getDistrictStats);
// Officer analytics
router.get('/officer/:id', auth_1.authenticate, (0, auth_1.authorize)('OFFICER', 'ADMIN'), analytics_1.analyticsController.getOfficerStats);
// Admin fraud analytics
router.get('/fraud-detection', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), analytics_1.analyticsController.getFraudDetection);
exports.default = router;
