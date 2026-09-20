"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authProviderService = void 0;
const google_auth_library_1 = require("google-auth-library");
const twilio_1 = __importDefault(require("twilio"));
exports.authProviderService = {
    /**
     * Cryptographically verify real Google ID Token returned from Google Identity Services
     */
    verifyGoogleToken: async (idToken) => {
        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Google ID token is required.');
        }
        const currentClientId = process.env.GOOGLE_CLIENT_ID ||
            '242104758662-jc2tau4io58q5grdirjsr471lkqt3mn3.apps.googleusercontent.com';
        const client = new google_auth_library_1.OAuth2Client(currentClientId);
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: currentClientId,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new Error('Google authentication payload is empty or invalid.');
            }
            if (!payload.email) {
                throw new Error('No verified email address found in the Google account.');
            }
            if (!payload.email_verified) {
                throw new Error('Google account email is not verified by Google.');
            }
            return {
                email: payload.email.toLowerCase(),
                name: payload.name || payload.email.split('@')[0],
                avatarUrl: payload.picture,
                googleId: payload.sub,
            };
        }
        catch (err) {
            // In case audience check fails or token is expired/invalid
            console.error('[AUTH-PROVIDER] Google token cryptographic verification error:', err.message);
            throw new Error(`Google OAuth verification failed: ${err.message}`);
        }
    },
    /**
     * Dispatch real SMS OTP to citizen phone number via Twilio Verify API
     */
    sendSmsOtp: async (phone) => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
        if (!accountSid || !authToken || !verifySid) {
            // Per architectural rule: do NOT fake or hardcode OTP. Explicitly require provider configuration.
            throw new Error('SMS Gateway unconfigured. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in backend/.env to deliver real SMS OTP to mobile devices.');
        }
        const client = (0, twilio_1.default)(accountSid, authToken);
        const verification = await client.verify.v2
            .services(verifySid)
            .verifications.create({ to: phone, channel: 'sms' });
        return {
            success: true,
            message: `Verification code sent via real SMS. Status: ${verification.status}`,
        };
    },
    /**
     * Verify real SMS OTP against Twilio Verify API
     */
    verifySmsOtp: async (phone, code) => {
        if (!code || code.length < 4) {
            throw new Error('Please enter the valid OTP code received on your phone.');
        }
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
        if (!accountSid || !authToken || !verifySid) {
            throw new Error('SMS Gateway unconfigured. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in backend/.env to verify real SMS OTP.');
        }
        const client = (0, twilio_1.default)(accountSid, authToken);
        const verificationCheck = await client.verify.v2
            .services(verifySid)
            .verificationChecks.create({ to: phone, code });
        if (verificationCheck.status !== 'approved') {
            throw new Error('Invalid or expired OTP code. Verification failed.');
        }
        return true;
    },
};
