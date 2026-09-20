"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateComplaintFraud = evaluateComplaintFraud;
const calculateDistance_1 = require("../utils/calculateDistance");
/**
 * Evaluates fraud risk factors for a newly submitted complaint according to TN Civics Plus protocol:
 * 1. Duplicate photos check (+30 pts)
 * 2. GPS mismatch (>50km apart from previous submissions) (+25 pts)
 * 3. User with 5+ rejected complaints (+20 pts)
 * 4. Multiple accounts detected with same phone (+40 pts)
 * 5. Report submitted outside user's home district (+10 pts)
 *
 * If cumulative user fraud score exceeds 80 points, an automatic 7-day ban is triggered.
 */
function evaluateComplaintFraud(complaint, user) {
    const flags = [];
    let scoreGained = 0;
    // (1) Duplicate photos check: Check if any uploaded photo URL has been used in previous complaints
    const hasDuplicatePhoto = complaint.photoUrls.some((url) => user.existingPhotoUrls.includes(url));
    if (hasDuplicatePhoto) {
        flags.push({
            reason: 'Duplicate photo detected across multiple complaints (+30)',
            score: 30,
        });
        scoreGained += 30;
    }
    // (2) GPS mismatch: User reports from locations > 50km apart from their previous complaint
    if (user.previousComplaintCoordinates.length > 0) {
        const recentCoord = user.previousComplaintCoordinates[0];
        const distKm = (0, calculateDistance_1.calculateDistance)(recentCoord.latitude, recentCoord.longitude, complaint.latitude, complaint.longitude);
        if (distKm > 50) {
            flags.push({
                reason: `GPS mismatch: Submission is ${distKm.toFixed(1)}km (>50km) from recent complaint (+25)`,
                score: 25,
            });
            scoreGained += 25;
        }
    }
    // (3) User has 5 or more rejected complaints
    if (user.rejectedComplaintsCount >= 5) {
        flags.push({
            reason: `High rejection history: User has ${user.rejectedComplaintsCount} previously rejected complaints (+20)`,
            score: 20,
        });
        scoreGained += 20;
    }
    // (4) Multiple accounts from same phone number
    if (user.accountsWithSamePhoneCount > 1) {
        flags.push({
            reason: `Account anomaly: Multiple user profiles linked to phone ${user.phone} (+40)`,
            score: 40,
        });
        scoreGained += 40;
    }
    // (5) Reports outside registered home district
    if (user.location &&
        complaint.location &&
        !complaint.location.toLowerCase().includes(user.location.toLowerCase()) &&
        !user.location.toLowerCase().includes(complaint.location.toLowerCase())) {
        flags.push({
            reason: `Geographic mismatch: Report filed in '${complaint.location}' outside registered district '${user.location}' (+10)`,
            score: 10,
        });
        scoreGained += 10;
    }
    const newTotalScore = (user.currentFraudScore || 0) + scoreGained;
    const shouldAutoBan = newTotalScore > 80;
    const bannedUntil = shouldAutoBan
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        : undefined;
    return {
        score: scoreGained,
        flags,
        shouldAutoBan,
        bannedUntil,
        newTotalScore,
    };
}
