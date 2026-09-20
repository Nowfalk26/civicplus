import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { OfficerRequest } from '../models/OfficerRequest';
import { Employee } from '../models/Employee';
import { getNextAccountNumber } from '../models/Counter';
import { connectDb } from '../lib/db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
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
  // POST /api/auth/register (Citizen standard registration)
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { username, email, phone, password, location } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { phone },
          { username: username.toLowerCase().trim() },
        ],
      });

      if (existingUser) {
        let msg = 'An account with these details already exists.';
        if (existingUser.email === normalizedEmail) msg = 'An account with this email address already exists.';
        else if (existingUser.phone === phone) msg = 'An account with this phone number already exists.';
        else if (existingUser.username === username.toLowerCase().trim()) msg = 'This username is already taken.';

        res.status(400).json({ success: false, message: msg });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const accountNumber = await getNextAccountNumber();

      const newUser = await User.create({
        accountNumber,
        username: username.toLowerCase().trim(),
        name: username,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: 'CITIZEN',
        location,
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
        presenceStatus: 'ONLINE',
        isOnline: true,
        accountStatus: 'ACTIVE',
        lastLoginAt: new Date(),
        lastSeenAt: new Date(),
        successfulLoginCount: 1,
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

      await emailService.sendWelcomeEmail(newUser.email, newUser.username).catch(() => {});

      const userObj = newUser.toJSON();
      res.status(201).json({
        success: true,
        message: 'Registration successful. Welcome to Civics Plus!',
        user: userObj,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Registration failed.' });
    }
  },

  // POST /api/auth/login (Standard login)
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { identifier, password } = validation.data;
      const normalized = identifier.toLowerCase().trim();

      const user = await User.findOne({
        $or: [{ email: normalized }, { phone: identifier.trim() }, { username: normalized }],
      }).select('+password');

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        return;
      }

      if (!user.password) {
        res.status(401).json({
          success: false,
          message: 'This account uses Google Sign-In or Mobile OTP. Please log in with that method.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await User.findByIdAndUpdate(user._id, { $inc: { failedLoginCount: 1, loginAttemptCount: 1 } });
        res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      if (user.isBanned || user.accountStatus === 'SUSPENDED') {
        res.status(403).json({ success: false, message: 'Your account is suspended.' });
        return;
      }

      // Update presence and login statistics in MongoDB
      user.isOnline = true;
      user.presenceStatus = 'ONLINE';
      user.lastLoginAt = new Date();
      user.lastSeenAt = new Date();
      user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
      user.loginAttemptCount = (user.loginAttemptCount || 0) + 1;
      await user.save();

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

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

      res.json({
        success: true,
        message: 'Login successful.',
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Error during login.' });
    }
  },

  // POST /api/auth/civic/login
  civicLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        console.warn('[AUTH] Login failed: CIVIC (validation error)');
        res.status(400).json({
          success: false,
          errorCategory: 'INVALID_REQUEST',
          errors: validation.error.errors.map((e) => e.message),
        });
        return;
      }

      const { identifier, password } = validation.data;
      const normalized = identifier.toLowerCase().trim();
      console.log(`[AUTH] Login request received: CIVIC (${normalized})`);

      const user = await User.findOne({
        $or: [{ email: normalized }, { phone: identifier.trim() }, { username: normalized }],
      }).select('+password');

      console.log(`[AUTH] User lookup completed: CIVIC (${normalized})`);

      if (!user) {
        console.warn(`[AUTH] Login failed: CIVIC (${normalized}) - Reason: Account not found`);
        res.status(404).json({ success: false, errorCategory: 'ACCOUNT_NOT_FOUND', message: 'No Civic account found with these credentials.' });
        return;
      }

      if (user.role !== 'CITIZEN') {
        console.warn(`[AUTH] Login failed: CIVIC (${normalized}) - Reason: Non-citizen role`);
        res.status(403).json({
          success: false,
          errorCategory: 'ACCESS_DENIED',
          message: 'This portal is strictly for Citizens / Civic users. Officers and Controllers must use their dedicated portals.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        console.warn(`[AUTH] Login failed: CIVIC (${normalized}) - Reason: Invalid password`);
        res.status(401).json({ success: false, errorCategory: 'INVALID_CREDENTIALS', message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      if (user.isBanned || user.accountStatus === 'SUSPENDED') {
        console.warn(`[AUTH] Login failed: CIVIC (${normalized}) - Reason: Account suspended`);
        res.status(403).json({ success: false, errorCategory: 'ACCOUNT_DISABLED', message: 'Your account is suspended.' });
        return;
      }

      console.log(`[AUTH] Authentication verified: CIVIC (${normalized})`);

      // Update presence
      user.isOnline = true;
      user.presenceStatus = 'ONLINE';
      user.lastLoginAt = new Date();
      user.lastSeenAt = new Date();
      user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
      await user.save();

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      console.log(`[AUTH] Login successful: CIVIC (${user.accountNumber})`);

      res.json({
        success: true,
        message: 'Civic login successful.',
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[AUTH] Login failed: CIVIC - Reason:', error.message || error);
      res.status(500).json({ success: false, errorCategory: 'SERVER_ERROR', message: error.message || 'Error during civic login.' });
    }
  },

  // POST /api/auth/civic/google (Stable permanent identity)
  civicGoogleLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { credential, idToken } = req.body;
      const token = credential || idToken;
      if (!token) {
        console.warn('[AUTH] Login failed: CIVIC GOOGLE (missing token)');
        res.status(400).json({ success: false, errorCategory: 'MISSING_CREDENTIALS', message: 'Google OAuth credential / ID token is required.' });
        return;
      }

      // Cryptographically verify Google token
      const googleUser = await authProviderService.verifyGoogleToken(token);
      const email = googleUser.email.toLowerCase().trim();
      const stableAuthId = googleUser.googleId;
      console.log(`[AUTH] Login request received: CIVIC GOOGLE (${email})`);

      // 1. Stable lookup: Find existing MongoDB User by stable authProviderUserId OR verified email
      let user = await User.findOne({
        $or: [{ authProviderUserId: stableAuthId }, { email }],
      });

      console.log(`[AUTH] User lookup completed: CIVIC GOOGLE (${email})`);

      if (user && user.role !== 'CITIZEN') {
        console.warn(`[AUTH] Login failed: CIVIC GOOGLE (${email}) - Reason: Administrative role`);
        res.status(403).json({
          success: false,
          errorCategory: 'ACCESS_DENIED',
          message: 'This Google account is registered under an administrative or officer role. Use the official officer/controller portal.',
        });
        return;
      }

      if (user) {
        // Account exists! REUSE the same permanent user and update session/presence
        user.authProviderUserId = stableAuthId;
        user.isOnline = true;
        user.presenceStatus = 'ONLINE';
        user.lastLoginAt = new Date();
        user.lastSeenAt = new Date();
        user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
        if (googleUser.avatarUrl && !user.avatarUrl) {
          user.avatarUrl = googleUser.avatarUrl;
        }
        await user.save();
        console.log(`[AUTH] Reused existing permanent account: ${user.email} (${user.accountNumber})`);
      } else {
        // First login: CREATE ONE permanent MongoDB User record
        const accountNumber = await getNextAccountNumber();
        const baseUsername = (googleUser.name || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .substring(0, 15);
        const username = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;

        user = await User.create({
          accountNumber,
          authProviderUserId: stableAuthId,
          username,
          name: googleUser.name || 'Civic Resident',
          email,
          phone: `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`,
          role: 'CITIZEN',
          location: 'Chennai, Tamil Nadu',
          avatarUrl: googleUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          presenceStatus: 'ONLINE',
          isOnline: true,
          accountStatus: 'ACTIVE',
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
          successfulLoginCount: 1,
        });
        console.log(`[AUTH] Created ONE permanent MongoDB account: ${user.email} (${user.accountNumber})`);
      }

      if (user.isBanned || user.accountStatus === 'SUSPENDED') {
        console.warn(`[AUTH] Login failed: CIVIC GOOGLE (${email}) - Reason: Account suspended`);
        res.status(403).json({ success: false, errorCategory: 'ACCOUNT_DISABLED', message: 'Account is currently suspended.' });
        return;
      }

      console.log(`[AUTH] Authentication verified: CIVIC GOOGLE (${email})`);

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

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

      console.log(`[AUTH] Login successful: CIVIC GOOGLE (${user.accountNumber})`);

      res.json({
        success: true,
        message: 'Google authentication verified successfully.',
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[AUTH] Login failed: CIVIC GOOGLE - Reason:', error.message || error);
      res.status(401).json({ success: false, errorCategory: 'AUTH_PROVIDER_FAILURE', message: error.message || 'Google authentication error.' });
    }
  },

  // POST /api/auth/civic/mobile/send-otp
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

  // POST /api/auth/civic/mobile/verify-otp (Stable permanent identity)
  civicVerifyOtp: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { phone, otp, name, location } = req.body;
      if (!phone || !otp) {
        res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
        return;
      }

      const cleanPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      await authProviderService.verifySmsOtp(cleanPhone, otp);

      // Stable lookup: Find existing MongoDB user by authProviderUserId (phone) OR phone number
      let user = await User.findOne({
        $or: [{ authProviderUserId: cleanPhone }, { phone: cleanPhone }],
      });

      if (user && user.role !== 'CITIZEN') {
        res.status(403).json({
          success: false,
          message: 'This mobile number is registered under an Officer/Controller account. Please use the official portal.',
        });
        return;
      }

      if (user) {
        // Reuse existing MongoDB account!
        user.authProviderUserId = cleanPhone;
        user.isOnline = true;
        user.presenceStatus = 'ONLINE';
        user.lastLoginAt = new Date();
        user.lastSeenAt = new Date();
        user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
        await user.save();
        console.log(`[AUTH-OTP] Reused existing permanent account: ${user.phone} (${user.accountNumber})`);
      } else {
        // First login: CREATE ONE permanent MongoDB User record
        const accountNumber = await getNextAccountNumber();
        const randomDigits = cleanPhone.slice(-4);
        const username = `citizen_${randomDigits}_${Math.floor(100 + Math.random() * 900)}`;

        user = await User.create({
          accountNumber,
          authProviderUserId: cleanPhone,
          username,
          name: name || `Resident ${randomDigits}`,
          email: `citizen_${randomDigits}@tn.gov.in.demo`,
          phone: cleanPhone,
          role: 'CITIZEN',
          location: location || 'Chennai, Tamil Nadu',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          presenceStatus: 'ONLINE',
          isOnline: true,
          accountStatus: 'ACTIVE',
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
          successfulLoginCount: 1,
        });
        console.log(`[AUTH-OTP] Created ONE permanent MongoDB account: ${user.phone} (${user.accountNumber})`);
      }

      if (user.isBanned || user.accountStatus === 'SUSPENDED') {
        res.status(403).json({ success: false, message: 'Account is currently suspended.' });
        return;
      }

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

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

      res.json({
        success: true,
        message: 'Mobile SMS verification verified successfully.',
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[SMS-OTP] Verify OTP failure:', error.message);
      res.status(400).json({ success: false, message: error.message || 'OTP verification failed.' });
    }
  },

  // POST /api/auth/controller/login
  controllerLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const identifier = req.body.identifier || req.body.email;
      const { password } = req.body;
      if (!identifier || !password) {
        console.warn('[AUTH] Login failed: CONTROLLER (missing credentials)');
        res.status(400).json({ success: false, errorCategory: 'MISSING_CREDENTIALS', message: 'Controller email/ID and password are required.' });
        return;
      }

      const normalizedIdentifier = identifier.trim().toLowerCase();
      console.log(`[AUTH] Login request received: CONTROLLER (${normalizedIdentifier})`);

      // Enforce the designated State Controller accounts
      const isAllowedController =
        normalizedIdentifier === 'nowfal@gmail.com' ||
        normalizedIdentifier === 'nowfal' ||
        normalizedIdentifier === 'admin@civicplus.tn.gov.in';

      if (!isAllowedController) {
        console.warn(`[AUTH] Login failed: CONTROLLER (${normalizedIdentifier}) - Reason: Unauthorized Controller ID`);
        res.status(403).json({
          success: false,
          errorCategory: 'ACCESS_DENIED',
          message: 'Access denied. Only the designated State Controller account (nowfal@gmail.com) can access this portal.',
        });
        return;
      }

      const user = await User.findOne({
        $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
        role: 'ADMIN',
      }).select('+password');

      console.log(`[AUTH] User lookup completed: CONTROLLER (${normalizedIdentifier})`);

      if (!user) {
        console.warn(`[AUTH] Login failed: CONTROLLER (${normalizedIdentifier}) - Reason: Account not found`);
        res.status(404).json({ success: false, errorCategory: 'ACCOUNT_NOT_FOUND', message: 'Access denied. Controller account not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        console.warn(`[AUTH] Login failed: CONTROLLER (${normalizedIdentifier}) - Reason: Invalid password`);
        res.status(401).json({ success: false, errorCategory: 'INVALID_CREDENTIALS', message: 'Access denied. Invalid Controller password.' });
        return;
      }

      console.log(`[AUTH] Authentication verified: CONTROLLER (${normalizedIdentifier})`);

      user.isOnline = true;
      user.presenceStatus = 'ONLINE';
      user.lastLoginAt = new Date();
      user.lastSeenAt = new Date();
      user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
      await user.save();

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

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

      console.log(`[AUTH] Login successful: CONTROLLER (${user.accountNumber})`);

      res.json({
        success: true,
        message: 'Controller authentication verified. Welcome, Chief Civic Controller.',
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[AUTH] Login failed: CONTROLLER - Reason:', error.message || error);
      res.status(500).json({ success: false, errorCategory: 'SERVER_ERROR', message: error.message || 'Controller login error.' });
    }
  },

  // POST /api/auth/officer/request-access
  officerRequestAccess: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { name, email, phone, department, designation, governmentIdProof, idProofType, reason } = req.body;

      if (!name || !email || !phone || !department || !designation) {
        res.status(400).json({
          success: false,
          message: 'All fields including official Name, Email, Phone, Department, and Designation are mandatory.',
        });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check existing Officer account
      const existingOfficer = await User.findOne({ email: normalizedEmail, role: 'OFFICER' });
      if (existingOfficer) {
        if (existingOfficer.approvalStatus === 'APPROVED' && existingOfficer.isApproved) {
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
      }

      // Check existing OfficerRequest document
      const existingReq = await OfficerRequest.findOne({ email: normalizedEmail, status: 'PENDING' });
      if (existingReq) {
        res.status(400).json({
          success: false,
          message: 'An access application for this official email is already pending Controller review.',
        });
        return;
      }

      const accountNumber = await getNextAccountNumber();
      const dummyHashedPassword = await bcrypt.hash(`OfficerInit@${Date.now()}`, 10);
      const username =
        name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 14) +
        '_' +
        Math.floor(100 + Math.random() * 900);

      // Create permanent User record in PENDING state
      const createdUser = await User.create({
        accountNumber,
        username,
        name,
        email: normalizedEmail,
        phone,
        password: dummyHashedPassword,
        role: 'OFFICER',
        department,
        designation,
        governmentIdProof: governmentIdProof || 'TN-OFFICER-VERIFIED',
        idProofType: idProofType || 'TN_CIVIC_BADGE',
        requestReason: reason || 'Departmental roster verification',
        location: 'Tamil Nadu',
        approvalStatus: 'PENDING',
        isApproved: false,
        accountStatus: 'PENDING_APPROVAL',
        presenceStatus: 'OFFLINE',
        isOnline: false,
        needsPasswordChange: true,
      });

      // Also record in OfficerRequest collection
      await OfficerRequest.create({
        applicantId: createdUser._id,
        name,
        email: normalizedEmail,
        phone,
        department,
        designation,
        district: 'Tamil Nadu',
        governmentIdProof: governmentIdProof || 'TN-OFFICER-VERIFIED',
        idProofType: idProofType || 'TN_CIVIC_BADGE',
        reason: reason || 'Departmental roster verification',
        status: 'PENDING',
      });

      console.log(`[OFFICER-REQUEST] Created Officer request for ${normalizedEmail} (${accountNumber})`);

      res.status(201).json({
        success: true,
        message: 'Officer access request submitted successfully. It is now awaiting Controller review and activation.',
        officer: createdUser.toJSON(),
      });
    } catch (error: any) {
      console.error('officerRequestAccess error:', error);
      res.status(500).json({ success: false, message: 'Error submitting officer access request.' });
    }
  },

  // POST /api/auth/officer/login
  officerLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { email, password } = req.body;
      if (!email || !password) {
        console.warn('[AUTH] Login failed: OFFICER (missing credentials)');
        res.status(400).json({ success: false, errorCategory: 'MISSING_CREDENTIALS', message: 'Approved officer email and password are required.' });
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[AUTH] Login request received: OFFICER (${normalizedEmail})`);

      const user = await User.findOne({ email: normalizedEmail, role: 'OFFICER' }).select('+password');
      console.log(`[AUTH] User lookup completed: OFFICER (${normalizedEmail})`);

      if (!user) {
        console.warn(`[AUTH] Login failed: OFFICER (${normalizedEmail}) - Reason: Account not found`);
        res.status(404).json({
          success: false,
          errorCategory: 'ACCOUNT_NOT_FOUND',
          message: 'Officer account not found. If you are a departmental officer, please submit an Access Request first.',
        });
        return;
      }

      // Check Controller approval status
      const isApproved = user.approvalStatus === 'APPROVED' && user.isApproved === true && !user.isBanned;
      if (!isApproved) {
        console.warn(`[AUTH] Login failed: OFFICER (${normalizedEmail}) - Reason: Pending Controller approval`);
        res.status(403).json({
          success: false,
          errorCategory: 'OFFICER_NOT_APPROVED',
          message: 'Your Officer account has not been approved by the Controller yet.',
          isPending: true,
          approvalStatus: user.approvalStatus || 'PENDING',
        });
        return;
      }

      if (user.accountStatus === 'SUSPENDED' || user.isBanned) {
        console.warn(`[AUTH] Login failed: OFFICER (${normalizedEmail}) - Reason: Account suspended`);
        res.status(403).json({ success: false, errorCategory: 'ACCOUNT_DISABLED', message: 'Your Officer account is currently suspended.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        console.warn(`[AUTH] Login failed: OFFICER (${normalizedEmail}) - Reason: Password incorrect`);
        res.status(401).json({ success: false, errorCategory: 'INVALID_CREDENTIALS', message: 'Invalid credentials. Password incorrect.' });
        return;
      }

      console.log(`[AUTH] Authentication verified: OFFICER (${normalizedEmail})`);

      // Update presence
      user.isOnline = true;
      user.presenceStatus = 'ONLINE';
      user.lastLoginAt = new Date();
      user.lastSeenAt = new Date();
      user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
      await user.save();

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      console.log(`[AUTH] Login successful: OFFICER (${user.accountNumber})`);

      res.json({
        success: true,
        message: 'Officer login successful.',
        user: user.toJSON(),
        needsPasswordChange: user.needsPasswordChange,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('[AUTH] Login failed: OFFICER - Reason:', error.message || error);
      res.status(500).json({ success: false, errorCategory: 'SERVER_ERROR', message: error.message || 'Error during officer login.' });
    }
  },

  // POST /api/auth/officer/google
  officerGoogleLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { credential, idToken } = req.body;
      const token = credential || idToken;
      if (!token) {
        res.status(400).json({ success: false, message: 'Google OAuth credential / ID token is required.' });
        return;
      }

      const googleUser = await authProviderService.verifyGoogleToken(token);
      const email = googleUser.email.toLowerCase().trim();

      const user = await User.findOne({ email, role: 'OFFICER' });
      if (!user) {
        res.status(403).json({
          success: false,
          message: `Access denied. The Google account (${email}) is not registered as an authorized departmental Officer.`,
        });
        return;
      }

      const isApproved = user.approvalStatus === 'APPROVED' && user.isApproved === true && !user.isBanned;
      if (!isApproved) {
        res.status(403).json({
          success: false,
          message: 'Your Officer account has not been approved by the Controller yet.',
          isPending: true,
          approvalStatus: user.approvalStatus || 'PENDING',
        });
        return;
      }

      user.authProviderUserId = googleUser.googleId;
      user.isOnline = true;
      user.presenceStatus = 'ONLINE';
      user.lastLoginAt = new Date();
      user.lastSeenAt = new Date();
      user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
      user.needsPasswordChange = false;
      await user.save();

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });

      res.json({
        success: true,
        message: 'Officer authenticated via Google OAuth successfully.',
        user: user.toJSON(),
        needsPasswordChange: false,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message || 'Google OAuth verification failed.' });
    }
  },

  // POST /api/auth/officer/set-password
  officerSetPassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || req.user.role !== 'OFFICER') {
        res.status(403).json({ success: false, message: 'Only authorized officers can perform this password setup.' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New permanent password must be at least 8 characters long.' });
        return;
      }

      const user = await User.findById(req.user.id).select('+password');
      if (!user) {
        res.status(404).json({ success: false, message: 'Officer profile not found.' });
        return;
      }

      if (currentPassword && user.password) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          res.status(400).json({ success: false, message: 'Current temporary password verification failed.' });
          return;
        }
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.needsPasswordChange = false;
      await user.save();

      res.json({
        success: true,
        message: 'Permanent password has been configured successfully. Full officer dashboard access enabled.',
        user: user.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error setting new permanent password.' });
    }
  },

  // POST /api/auth/employee/login (Dedicated employee authentication)
  employeeLogin: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        console.warn('[AUTH] Login failed: EMPLOYEE (missing credentials)');
        res.status(400).json({ success: false, errorCategory: 'MISSING_CREDENTIALS', message: 'Employee Email, Phone, or ID and password are required.' });
        return;
      }

      const trimmed = identifier.trim();
      const normalized = trimmed.toLowerCase();
      const cleanPhone = trimmed.replace(/\D/g, '');
      console.log(`[AUTH] Login request received: EMPLOYEE (${normalized})`);

      // Find employee by email, employeeId, or phone
      const empRecord = await Employee.findOne({
        $or: [
          { email: normalized },
          { employeeId: trimmed.toUpperCase() },
          { phone: trimmed },
          ...(cleanPhone.length >= 10 ? [{ phone: { $regex: cleanPhone.slice(-10) + '$' } }] : []),
        ],
      });

      console.log(`[AUTH] User lookup completed: EMPLOYEE (${empRecord?.employeeId || normalized})`);

      if (!empRecord) {
        console.warn(`[AUTH] Login failed: EMPLOYEE (${normalized}) - Reason: Employee record not found`);
        res.status(404).json({ success: false, errorCategory: 'ACCOUNT_NOT_FOUND', message: 'Employee account not found.' });
        return;
      }

      if (empRecord.accountStatus === 'DISABLED') {
        console.warn(`[AUTH] Login failed: EMPLOYEE (${empRecord.employeeId}) - Reason: Account disabled`);
        res.status(403).json({ success: false, errorCategory: 'ACCOUNT_DISABLED', message: 'Employee account has been deactivated. Please contact your department officer.' });
        return;
      }

      const user = await User.findById(empRecord.userId).select('+password');
      if (!user) {
        console.warn(`[AUTH] Login failed: EMPLOYEE (${empRecord.employeeId}) - Reason: User credentials record not found`);
        res.status(404).json({ success: false, errorCategory: 'ACCOUNT_NOT_FOUND', message: 'Employee user credentials not found.' });
        return;
      }

      if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DISABLED' || user.isBanned) {
        console.warn(`[AUTH] Login failed: EMPLOYEE (${empRecord.employeeId}) - Reason: User account disabled`);
        res.status(403).json({ success: false, errorCategory: 'ACCOUNT_DISABLED', message: 'Employee account is currently disabled.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        console.warn(`[AUTH] Login failed: EMPLOYEE (${empRecord.employeeId}) - Reason: Password incorrect`);
        res.status(401).json({ success: false, errorCategory: 'INVALID_CREDENTIALS', message: 'Invalid employee password.' });
        return;
      }

      console.log(`[AUTH] Authentication verified: EMPLOYEE (${empRecord.employeeId})`);

      user.isOnline = true;
      user.presenceStatus = 'ONLINE';
      user.lastLoginAt = new Date();
      user.lastSeenAt = new Date();
      user.successfulLoginCount = (user.successfulLoginCount || 0) + 1;
      await user.save();

      const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: 'EMPLOYEE' });
      const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: 'EMPLOYEE' });

      console.log(`[AUTH] Login successful: EMPLOYEE (${empRecord.employeeId})`);

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

      res.json({
        success: true,
        message: 'Employee authenticated successfully.',
        mustChangePassword: !!empRecord.mustChangePassword,
        user: {
          ...user.toJSON(),
          employeeProfile: empRecord.toJSON(),
        },
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.error('Employee login error:', error);
      res.status(500).json({ success: false, message: 'Error during employee login.' });
    }
  },

  // POST /api/auth/employee/change-password
  employeeChangePassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || req.user.role !== 'EMPLOYEE') {
        res.status(403).json({ success: false, message: 'Only authorized employees can perform this action.' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
        return;
      }

      const user = await User.findById(req.user.id).select('+password');
      if (!user) {
        res.status(404).json({ success: false, message: 'Employee profile not found.' });
        return;
      }

      if (currentPassword && user.password) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          res.status(400).json({ success: false, message: 'Current password verification failed.' });
          return;
        }
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      await Employee.findOneAndUpdate({ userId: user._id }, { mustChangePassword: false });

      res.json({
        success: true,
        message: 'Password changed successfully. You may now continue using your account with your new password.',
      });
    } catch (error: any) {
      console.error('Employee change password error:', error);
      res.status(500).json({ success: false, message: 'Error changing password.' });
    }
  },

  // POST /api/auth/logout (Never deletes account - updates presence to OFFLINE)
  logout: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      let userId = req.user?.id;

      if (!userId) {
        // Try decoding token from headers/cookies
        let token: string | undefined;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
          token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.accessToken) {
          token = req.cookies.accessToken;
        }

        if (token) {
          try {
            const decoded = verifyAccessToken(token);
            userId = decoded.userId;
          } catch {
            try {
              const decoded = verifyRefreshToken(token);
              userId = decoded.userId;
            } catch {}
          }
        }
      }

      if (userId) {
        // Mark presence as OFFLINE in MongoDB. Account is PERMANENT and preserved!
        await User.findByIdAndUpdate(userId, {
          presenceStatus: 'OFFLINE',
          isOnline: false,
          lastSeenAt: new Date(),
        });
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Logged out successfully. Account status set to OFFLINE.' });
    } catch (error: any) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Logged out.' });
    }
  },

  // DELETE /api/auth/account (Explicit user self-deletion flow only)
  deleteAccount: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }

      // Explicit authorized user account removal
      await User.findByIdAndDelete(req.user.id);
      await Employee.findOneAndDelete({ userId: req.user.id });

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.json({
        success: true,
        message: 'Your account has been permanently deleted upon your explicit request.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete account.' });
    }
  },

  // GET /api/auth/me
  getMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Please log in to continue.' });
      return;
    }

    let employeeProfile = null;
    if (req.user.role === 'EMPLOYEE') {
      employeeProfile = await Employee.findOne({ userId: req.user._id });
    }

    res.json({
      success: true,
      user: {
        ...req.user.toJSON(),
        employeeProfile: employeeProfile ? employeeProfile.toJSON() : null,
      },
    });
  },

  // PUT /api/auth/me
  updateMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const { location, avatarUrl, phone, name } = req.body;
      const updated = await User.findByIdAndUpdate(
        req.user.id,
        {
          ...(location ? { location } : {}),
          ...(avatarUrl ? { avatarUrl } : {}),
          ...(phone ? { phone } : {}),
          ...(name ? { name } : {}),
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: updated?.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
  },

  // POST /api/auth/refresh
  refresh: async (req: Request, res: Response): Promise<void> => {
    try {
      await connectDb();
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token required.' });
        return;
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || user.isBanned || user.accountStatus === 'SUSPENDED') {
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

  // Officer Profile Change Requests
  officerCreateProfileChangeRequest: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await connectDb();
      if (!req.user || req.user.role !== 'OFFICER') {
        res.status(403).json({ success: false, message: 'Only officers can submit profile change requests.' });
        return;
      }

      const { requestedDepartment, requestedDesignation, requestedLocation, requestedPhone } = req.body;
      const updated = await User.findByIdAndUpdate(
        req.user.id,
        {
          ...(requestedDepartment ? { department: requestedDepartment } : {}),
          ...(requestedDesignation ? { designation: requestedDesignation } : {}),
          ...(requestedLocation ? { location: requestedLocation } : {}),
          ...(requestedPhone ? { phone: requestedPhone } : {}),
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Officer profile updated successfully.',
        user: updated?.toJSON(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating officer profile.' });
    }
  },

  officerGetProfileChangeRequests: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ success: true, requests: [] });
  },

  getGoogleConfig: async (_req: Request, res: Response): Promise<void> => {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const isConfigured = Boolean(clientId && clientId.includes('.apps.googleusercontent.com'));
    res.json({
      success: true,
      clientId: isConfigured ? clientId : '',
      isConfigured,
    });
  },

  saveGoogleClientId: async (req: Request, res: Response): Promise<void> => {
    const { clientId } = req.body;
    if (!clientId || !clientId.trim().includes('.apps.googleusercontent.com')) {
      res.status(400).json({ success: false, message: 'Invalid Google Client ID format.' });
      return;
    }
    process.env.GOOGLE_CLIENT_ID = clientId.trim();
    res.json({ success: true, message: 'Google Client ID saved.', clientId: clientId.trim() });
  },
};
