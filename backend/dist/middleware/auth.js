"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const db_1 = require("../lib/db");
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'civics_plus_super_secret_access_key_tamil_nadu_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'civics_plus_super_secret_refresh_key_tamil_nadu_2026';
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
/**
 * Authentication Middleware:
 * Extracts and verifies JWT token from Authorization header or cookies.
 * Loads the stable persistent user from MongoDB.
 */
async function authenticate(req, res, next) {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Please log in to continue.',
            });
            return;
        }
        await (0, db_1.connectDb)();
        const decoded = verifyAccessToken(token);
        const user = await User_1.User.findById(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Account not found. Please log in again.',
            });
            return;
        }
        // Check ban / suspension status
        if (user.isBanned || user.accountStatus === 'SUSPENDED') {
            if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
                res.status(403).json({
                    success: false,
                    message: `Your account is temporarily suspended until ${new Date(user.bannedUntil).toLocaleDateString('en-IN')}.`,
                    bannedUntil: user.bannedUntil,
                });
                return;
            }
            else if (!user.bannedUntil) {
                res.status(403).json({
                    success: false,
                    message: 'Your account has been suspended by administration.',
                });
                return;
            }
        }
        if (user.accountStatus === 'DISABLED') {
            res.status(403).json({
                success: false,
                message: 'Your account has been deactivated.',
            });
            return;
        }
        // Update lastSeenAt activity timestamp in background
        User_1.User.findByIdAndUpdate(user._id, {
            lastSeenAt: new Date(),
            isOnline: true,
            presenceStatus: 'ONLINE',
        }).exec().catch(() => { });
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.',
        });
    }
}
/**
 * Role-Based Access Control Middleware
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Please log in to continue.' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Forbidden. Role '${req.user.role}' lacks permissions. Required: ${allowedRoles.join(' or ')}`,
            });
            return;
        }
        // Strict check for Officer approval
        if (req.user.role === 'OFFICER') {
            const isApproved = req.user.approvalStatus === 'APPROVED' && req.user.isApproved === true && !req.user.isBanned;
            if (!isApproved) {
                res.status(403).json({
                    success: false,
                    message: 'Your Officer account has not been approved by the Controller yet.',
                    approvalStatus: req.user.approvalStatus || 'PENDING',
                });
                return;
            }
        }
        next();
    };
}
