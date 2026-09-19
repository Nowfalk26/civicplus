import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { inMemoryDb } from '../lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthenticatedRequest,
} from '../middleware/auth';
import { emailService } from '../services/email';
import { authProviderService } from '../services/authProvider';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must have at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?91?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number (+91)'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  location: z.string().min(2, 'Please select your Tamil Nadu district / location'),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { username, email, phone, password, location } = validation.data;

      // Check if user already exists
      const existingEmail = inMemoryDb.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (existingEmail) {
        res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
        return;
      }

      const existingPhone = inMemoryDb.users.find((u) => u.phone === phone);
      if (existingPhone) {
        res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists.',
        });
        return;
      }

      const existingUsername = inMemoryDb.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (existingUsername) {
        res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another.',
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = inMemoryDb.createUser({
        username,
        email,
        phone,
        password: hashedPassword,
        role: 'CITIZEN',
        location,
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      });

      const accessToken = generateAccessToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });
      const refreshToken = generateRefreshToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await emailService.sendWelcomeEmail(newUser.email, newUser.username);

      const { password: _, ...userSafe } = newUser;
      res.status(201).json({
        success: true,
        message: 'Registration successful. Welcome to Civics Plus!',
        user: userSafe,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration.',
      });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { identifier, password } = validation.data;
      const user = inMemoryDb.findUserByEmailOrPhone(identifier);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials. User not found.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials. Password incorrect.',
        });
        return;
      }

      // Ban verification
      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
          res.status(403).json({
            success: false,
            message: `Account suspended until ${new Date(user.bannedUntil).toLocaleDateString('en-IN')}. Fraud score: ${user.fraudScore}`,
            bannedUntil: user.bannedUntil,
          });
          return;
        } else if (!user.bannedUntil) {
          res.status(403).json({
            success: false,
            message: 'Your account has been permanently suspended by administration for civic fraud.',
          });
          return;
        }
      }

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Login successful.',
        user: userSafe,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login.',
      });
    }
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token required.' });
        return;
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = inMemoryDb.findUserById(decoded.userId);

      if (!user || user.isBanned) {
        res.status(403).json({ success: false, message: 'Session expired or user barred.' });
        return;
      }

      const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.json({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }
  },

  logout: async (_req: Request, res: Response): Promise<void> => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  },

  getMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Please log in to continue.' });
      return;
    }
    const { password: _, ...userSafe } = req.user;
    const isApproved =
      req.user.role !== 'OFFICER' ||
      (req.user.approvalStatus === 'APPROVED' && !req.user.isBanned) ||
      (!req.user.isBanned && req.user.approvalStatus !== 'PENDING' && req.user.approvalStatus !== 'REJECTED');

    res.json({
      success: true,
      user: {
        ...userSafe,
        approvalStatus: req.user.approvalStatus || (req.user.role === 'OFFICER' ? (req.user.isBanned ? 'PENDING' : 'APPROVED') : 'APPROVED'),
        isApproved,
        needsPasswordChange: req.user.needsPasswordChange || false,
      },
    });
  },

  updateMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const { location, avatarUrl, phone } = req.body;
      const updated = inMemoryDb.updateUser(req.user.id, {
        ...(location ? { location } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(phone ? { phone } : {}),
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const { password: _, ...userSafe } = updated;
      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: userSafe,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
  },

  // -------------------------------------------------------------
  // CIVIC AUTHENTICATION (Normal access, no approval required)
  // -------------------------------------------------------------
  civicLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { identifier, password } = validation.data;
      const user = inMemoryDb.findUserByEmailOrPhone(identifier);

      if (!user) {
        res.status(401).json({ success: false, message: 'No Civic account found with these credentials.' });
        return;
      }

      if (user.role !== 'CITIZEN') {
        res.status(403).json({
          success: false,
          message: 'This portal is strictly for Citizens / Civic users. Officers and Controllers must use their dedicated portals.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({
          success: false,
          message: 'Your account is currently suspended due to repeated false/fraudulent civic reports.',
        });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Civic login successful.',
        user: userSafe,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error during civic login.' });
    }
  },

  civicGoogleLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      const { credential, idToken } = req.body;
      const token = credential || idToken;
      if (!token) {
        res.status(400).json({ success: false, message: 'Google OAuth credential / ID token is required.' });
        return;
      }

      // Cryptographically verify token with official Google Identity Service
      const googleUser = await authProviderService.verifyGoogleToken(token);
      const email = googleUser.email;

      let user = inMemoryDb.findUserByEmailOrPhone(email);
      if (user && user.role !== 'CITIZEN') {
        res.status(403).json({
          success: false,
          message: 'This Google account is registered under an administrative or officer role. Use the official officer/controller portal.',
        });
        return;
      }

      if (!user) {
        const generatedUsername = (googleUser.name || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .substring(0, 15) + '_' + Math.floor(100 + Math.random() * 900);
        const dummyPassword = await bcrypt.hash(`google-auth-${Date.now()}`, 10);

        user = inMemoryDb.createUser({
          username: generatedUsername,
          name: googleUser.name || 'Civic Resident',
          email: email.toLowerCase(),
          phone: `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`,
          password: dummyPassword,
          role: 'CITIZEN',
          location: 'Chennai, Tamil Nadu',
          avatarUrl: googleUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        });
      }

      if (user.isBanned) {
        res.status(403).json({ success: false, message: 'Account is currently suspended.' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Google authentication verified successfully.',
        user: userSafe,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[GOOGLE-AUTH] Civic Google verification error:', error.message);
      res.status(401).json({ success: false, message: error.message || 'Google authentication error.' });
    }
  },

  civicSendOtp: async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone } = req.body;
      if (!phone || !/^\+?91?[6-9]\d{9}$/.test(phone)) {
        res.status(400).json({ success: false, message: 'Please provide a valid Indian mobile number (+91).' });
        return;
      }

      const cleanPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      const result = await authProviderService.sendSmsOtp(cleanPhone);

      res.json({
        success: true,
        message: result.message || `Verification code dispatched via real SMS to ${cleanPhone}.`,
      });
    } catch (error: any) {
      console.error('[SMS-OTP] Send OTP failure:', error.message);
      res.status(500).json({ success: false, message: error.message || 'Failed to dispatch real SMS OTP.' });
    }
  },

  civicVerifyOtp: async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, otp, name, location } = req.body;
      if (!phone || !otp) {
        res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
        return;
      }

      const cleanPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;

      // Cryptographically verify real SMS OTP with SMS provider
      await authProviderService.verifySmsOtp(cleanPhone, otp);

      let user = inMemoryDb.users.find((u) => u.phone === cleanPhone);

      if (user && user.role !== 'CITIZEN') {
        res.status(403).json({
          success: false,
          message: 'This mobile number is registered as an Officer/Controller account. Please use the official portal.',
        });
        return;
      }

      if (!user) {
        const dummyPassword = await bcrypt.hash(`otp-auth-${Date.now()}`, 10);
        const randomDigits = cleanPhone.slice(-4);
        user = inMemoryDb.createUser({
          username: `citizen_${randomDigits}`,
          name: name || `Resident ${randomDigits}`,
          email: `citizen_${randomDigits}@tn.gov.in.demo`,
          phone: cleanPhone,
          password: dummyPassword,
          role: 'CITIZEN',
          location: location || 'Chennai, Tamil Nadu',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        });
      }

      if (user.isBanned) {
        res.status(403).json({ success: false, message: 'Account is currently suspended.' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Mobile SMS verification verified successfully.',
        user: userSafe,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[SMS-OTP] Verify OTP failure:', error.message);
      res.status(400).json({ success: false, message: error.message || 'OTP verification failed.' });
    }
  },

  // -------------------------------------------------------------
  // CONTROLLER AUTHENTICATION (Exclusively: nowfal@gmail.com / Admin@123)
  // -------------------------------------------------------------
  controllerLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      const identifier = req.body.identifier || req.body.email;
      const { password } = req.body;
      if (!identifier || !password) {
        res.status(400).json({ success: false, message: 'Controller email/ID and password are required.' });
        return;
      }


      const normalizedIdentifier = identifier.trim().toLowerCase();

      // Enforce the single exclusive Controller identity: nowfal@gmail.com
      if (normalizedIdentifier !== 'nowfal@gmail.com' && normalizedIdentifier !== 'nowfal') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Only the designated State Controller account (nowfal@gmail.com) can access this portal.',
        });
        return;
      }

      const user = inMemoryDb.findUserByEmailOrPhone(normalizedIdentifier);
      if (!user) {
        res.status(401).json({ success: false, message: 'Access denied. Controller account not found.' });
        return;
      }

      // Must be role ADMIN and specifically the Controller
      if (user.role !== 'ADMIN' || user.email.toLowerCase() !== 'nowfal@gmail.com') {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not hold State Controller authority.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Access denied. Invalid Controller password.' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Controller authentication verified. Welcome, Chief Civic Controller Nowfal.',
        user: userSafe,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Controller login error.' });
    }
  },


  // -------------------------------------------------------------
  // OFFICER ACCESS REQUEST & APPROVAL-BASED AUTH
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // OFFICER ACCESS REQUEST & APPROVAL-BASED AUTH (No new storage)
  // -------------------------------------------------------------
  officerRequestAccess: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, phone, department, designation, governmentIdProof, idProofType, reason } = req.body;

      if (!name || !email || !phone || !department || !designation) {
        res.status(400).json({
          success: false,
          message: 'All fields including official Name, Email, Phone, Department, and Designation are mandatory.',
        });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists in the existing User storage
      const existingUser = inMemoryDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existingUser) {
        if (existingUser.role === 'OFFICER') {
          const isApproved =
            existingUser.approvalStatus === 'APPROVED' ||
            (!existingUser.isBanned && existingUser.approvalStatus !== 'PENDING' && existingUser.approvalStatus !== 'REJECTED');

          if (isApproved && !existingUser.isBanned) {
            res.status(400).json({
              success: false,
              message: 'An active approved officer account with this email already exists. Please log in directly.',
            });
            return;
          } else {
            res.status(400).json({
              success: false,
              message: 'An access application for this official email is already pending Controller review.',
            });
            return;
          }
        } else {
          // Existing citizen requesting officer upgrade: transition role to OFFICER in PENDING approval state
          const updated = inMemoryDb.updateUser(existingUser.id, {
            name,
            phone,
            role: 'OFFICER',
            department,
            designation,
            governmentIdProof,
            idProofType: idProofType || 'TN_CIVIC_BADGE',
            requestReason: reason,
            approvalStatus: 'PENDING',
            isApproved: false,
            needsPasswordChange: true,
          });

          const { password: _, ...userSafe } = updated!;
          res.status(200).json({
            success: true,
            message: 'Officer access request submitted successfully. It is now awaiting Controller review and activation.',
            officer: userSafe,
            request: userSafe,
          });
          return;
        }
      }

      const dummyHashedPassword = await bcrypt.hash(`OfficerInit@${Date.now()}`, 10);
      const username =
        name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 14) +
        '_' +
        Math.floor(100 + Math.random() * 900);

      // Store unapproved officer in PENDING approval state
      const createdUser = inMemoryDb.createUser({
        username,
        name,
        email: normalizedEmail,
        phone,
        password: dummyHashedPassword,
        role: 'OFFICER',
        department,
        designation,
        governmentIdProof,
        idProofType: idProofType || 'TN_CIVIC_BADGE',
        requestReason: reason,
        location: 'Tamil Nadu',
        approvalStatus: 'PENDING',
        isApproved: false,
        needsPasswordChange: true,
        isBanned: false,
      });

      console.log(`[OFFICER-REGISTRATION] New officer registered in pending state: ${name} (${normalizedEmail}) for ${department}.`);

      const { password: _, ...userSafe } = createdUser;
      res.status(201).json({
        success: true,
        message: 'Officer access request submitted successfully. It is now awaiting Controller review and activation.',
        officer: userSafe,
        request: userSafe,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error submitting officer access request.' });
    }
  },

  officerLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Approved officer email and password are required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = inMemoryDb.users.find((u) => u.email.toLowerCase() === normalizedEmail);

      // 1. Verify authenticated identity exists and role is OFFICER
      if (!user || user.role !== 'OFFICER') {
        res.status(401).json({
          success: false,
          message: 'Officer account not found. If you are a departmental officer, please submit an Access Request first.',
        });
        return;
      }

      // 2. Authoritative check: Is this identity an approved Officer? (Requirement 4 & 9)
      const isApproved =
        user.approvalStatus === 'APPROVED' ||
        user.isApproved === true ||
        (!user.isBanned && user.approvalStatus !== 'PENDING' && user.approvalStatus !== 'REJECTED');

      if (!isApproved) {
        res.status(403).json({
          success: false,
          message: 'Your Officer account has not been approved by the Controller yet.',
          isPending: true,
          approvalStatus: user.approvalStatus || 'PENDING',
        });
        return;
      }

      // 3. Verify account is not suspended
      if (user.isBanned) {
        res.status(403).json({
          success: false,
          message: 'Your Officer account is currently suspended by administration.',
        });
        return;
      }

      // 4. Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      const needsPasswordChange = user.needsPasswordChange !== false;

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Officer login successful.',
        user: {
          ...userSafe,
          approvalStatus: 'APPROVED',
          isApproved: true,
          needsPasswordChange,
        },
        needsPasswordChange,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error during officer login.' });
    }
  },

  officerGoogleLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      const { credential, idToken } = req.body;
      const token = credential || idToken;
      if (!token) {
        res.status(400).json({ success: false, message: 'Google OAuth credential / ID token is required.' });
        return;
      }

      // Verify token cryptographically with official Google identity provider
      const googleUser = await authProviderService.verifyGoogleToken(token);
      const email = googleUser.email.toLowerCase().trim();

      const user = inMemoryDb.users.find((u) => u.email.toLowerCase() === email);
      if (!user || user.role !== 'OFFICER') {
        res.status(403).json({
          success: false,
          message: `Access denied. The Google account (${email}) is not registered as an authorized departmental Officer.`,
        });
        return;
      }

      // Authoritative check: Is this identity an approved Officer? (Requirement 4 & 9)
      const isApproved =
        user.approvalStatus === 'APPROVED' ||
        user.isApproved === true ||
        (!user.isBanned && user.approvalStatus !== 'PENDING' && user.approvalStatus !== 'REJECTED');

      if (!isApproved) {
        res.status(403).json({
          success: false,
          message: 'Your Officer account has not been approved by the Controller yet.',
          isPending: true,
          approvalStatus: user.approvalStatus || 'PENDING',
        });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({
          success: false,
          message: `Access denied. Officer account (${email}) is currently suspended.`,
        });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      const { password: _, ...userSafe } = user;
      res.json({
        success: true,
        message: 'Officer authenticated via Google OAuth successfully.',
        user: {
          ...userSafe,
          approvalStatus: 'APPROVED',
          isApproved: true,
          needsPasswordChange: false,
        },
        needsPasswordChange: false,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[GOOGLE-AUTH] Officer Google login error:', error.message);
      res.status(401).json({ success: false, message: error.message || 'Google OAuth verification failed.' });
    }
  },

  officerSetPassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'OFFICER') {
        res.status(403).json({ success: false, message: 'Only authorized officers can perform this password setup.' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New permanent password must be at least 8 characters long.' });
        return;
      }

      const user = inMemoryDb.findUserById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Officer profile not found.' });
        return;
      }

      // If user currentPassword provided, verify it
      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          res.status(400).json({ success: false, message: 'Current temporary password verification failed.' });
          return;
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = inMemoryDb.updateUser(user.id, {
        password: hashedPassword,
        needsPasswordChange: false,
        approvalStatus: 'APPROVED',
        isApproved: true,
      });

      console.log(`[OFFICER-AUTH] Officer ${user.email} successfully updated permanent password.`);

      const { password: _, ...userSafe } = updated!;
      res.json({
        success: true,
        message: 'Permanent password has been configured successfully. Full officer dashboard access enabled.',
        user: {
          ...userSafe,
          approvalStatus: 'APPROVED',
          isApproved: true,
          needsPasswordChange: false,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error setting new permanent password.' });
    }
  },

  // -------------------------------------------------------------
  // OFFICER PROFILE UPDATE (Direct reuse of existing User record)
  // -------------------------------------------------------------
  officerCreateProfileChangeRequest: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'OFFICER') {
        res.status(403).json({ success: false, message: 'Only officers can perform official profile updates.' });
        return;
      }

      const officer = inMemoryDb.findUserById(req.user.id);
      if (!officer) {
        res.status(404).json({ success: false, message: 'Officer not found.' });
        return;
      }

      const {
        requestedDepartment,
        requestedDesignation,
        requestedLocation,
        requestedPhone,
      } = req.body;

      const updated = inMemoryDb.updateUser(officer.id, {
        ...(requestedDepartment ? { department: requestedDepartment } : {}),
        ...(requestedDesignation ? { designation: requestedDesignation } : {}),
        ...(requestedLocation ? { location: requestedLocation } : {}),
        ...(requestedPhone ? { phone: requestedPhone } : {}),
      });

      console.log(`[OFFICER-PROFILE-UPDATE] Officer ${officer.email} updated profile attributes in existing User model.`);

      const { password: _, ...userSafe } = updated!;
      res.json({
        success: true,
        message: 'Officer profile updated successfully.',
        user: userSafe,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating officer profile.' });
    }
  },

  officerGetProfileChangeRequests: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'OFFICER') {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      res.json({
        success: true,
        requests: [],
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching requests.' });
    }
  },

  getGoogleConfig: async (req: Request, res: Response): Promise<void> => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      const isPlaceholder = !clientId || clientId.includes('mock') || !clientId.includes('.apps.googleusercontent.com');
      res.json({
        success: true,
        clientId: isPlaceholder ? '' : clientId,
        isConfigured: !isPlaceholder,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve Google config.' });
    }
  },

  saveGoogleClientId: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId } = req.body;
      if (!clientId || typeof clientId !== 'string' || !clientId.trim().includes('.apps.googleusercontent.com')) {
        res.status(400).json({
          success: false,
          message: 'Invalid Google Client ID format. It must end with .apps.googleusercontent.com',
        });
        return;
      }

      const cleanId = clientId.trim();
      process.env.GOOGLE_CLIENT_ID = cleanId;

      // Update backend/.env and frontend/.env on disk
      try {
        const fs = await import('fs');
        const path = await import('path');

        const backendEnvPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(backendEnvPath)) {
          let content = fs.readFileSync(backendEnvPath, 'utf-8');
          if (content.includes('GOOGLE_CLIENT_ID=')) {
            content = content.replace(/GOOGLE_CLIENT_ID=.*/, `GOOGLE_CLIENT_ID="${cleanId}"`);
          } else {
            content += `\nGOOGLE_CLIENT_ID="${cleanId}"\n`;
          }
          fs.writeFileSync(backendEnvPath, content, 'utf-8');
        }

        const frontendEnvPath = path.resolve(process.cwd(), '../frontend/.env');
        if (fs.existsSync(frontendEnvPath)) {
          let content = fs.readFileSync(frontendEnvPath, 'utf-8');
          if (content.includes('VITE_GOOGLE_CLIENT_ID=')) {
            content = content.replace(/VITE_GOOGLE_CLIENT_ID=.*/, `VITE_GOOGLE_CLIENT_ID="${cleanId}"`);
          } else {
            content += `\nVITE_GOOGLE_CLIENT_ID="${cleanId}"\n`;
          }
          fs.writeFileSync(frontendEnvPath, content, 'utf-8');
        }
      } catch (err: any) {
        console.warn('[CONFIG] Note on saving .env files:', err.message);
      }

      res.json({
        success: true,
        message: 'Real Google Client ID updated successfully.',
        clientId: cleanId,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to save Google Client ID.' });
    }
  },
};


