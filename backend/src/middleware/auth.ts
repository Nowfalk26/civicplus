import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { inMemoryDb } from '../lib/prisma';
import { UserRecord } from '../data/seedData';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'civics_plus_super_secret_access_key_tamil_nadu_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'civics_plus_super_secret_refresh_key_tamil_nadu_2026';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function generateAccessToken(payload: { userId: string; email: string; role: 'CITIZEN' | 'OFFICER' | 'ADMIN' }): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: { userId: string; email: string; role: 'CITIZEN' | 'OFFICER' | 'ADMIN' }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

/**
 * Authentication Middleware:
 * Extracts JWT token from Authorization header (Bearer ...) or httpOnly cookie.
 * Validates token and checks if user is suspended/banned.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Please log in to continue.',
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = inMemoryDb.findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Please log in to continue.',
      });
      return;
    }

    // Check ban status
    if (user.isBanned) {
      if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
        res.status(403).json({
          success: false,
          message: `Your account is temporarily suspended until ${new Date(user.bannedUntil).toLocaleDateString('en-IN')}. Reason: Excessive civic fraud / fraudulent activity.`,
          bannedUntil: user.bannedUntil,
        });
        return;
      } else if (!user.bannedUntil) {
        res.status(403).json({
          success: false,
          message: 'Your account has been permanently suspended by administration for civic fraud violations.',
        });
        return;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Please log in to continue.',
    });
  }
}

/**
 * Role-Based Access Control Middleware
 */
export function authorize(...allowedRoles: ('CITIZEN' | 'OFFICER' | 'ADMIN')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Please log in to continue.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' lacks permissions for this action. Required: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    // Authoritative check for Officer access approval
    if (req.user.role === 'OFFICER' && allowedRoles.includes('OFFICER')) {
      const isApproved =
        req.user.approvalStatus === 'APPROVED' ||
        req.user.isApproved === true ||
        (!req.user.isBanned && req.user.approvalStatus !== 'PENDING' && req.user.approvalStatus !== 'REJECTED');

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
