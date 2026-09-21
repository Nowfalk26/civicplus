"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMongoUri = sanitizeMongoUri;
exports.connectDb = connectDb;
exports.seedControllerAdmin = seedControllerAdmin;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dns_1 = __importDefault(require("dns"));
const User_1 = require("../models/User");
const Counter_1 = require("../models/Counter");
// Configure public DNS servers for reliable SRV resolution across environments
try {
    dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
}
catch {
    // Ignore DNS setServers failure in environments with restricted permissions
}
const cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
    global.mongooseCache = cached;
}
/**
 * Sanitizes a MongoDB connection URI by redacting username & password
 */
function sanitizeMongoUri(uri) {
    if (!uri)
        return 'undefined';
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}
/**
 * Initializes and maintains the persistent MongoDB connection.
 * Strictly uses configured process.env.MONGODB_URI from environment variables.
 * No hardcoded credentials. No in-memory database fallback.
 */
async function connectDb() {
    if (cached.conn && mongoose_1.default.connection.readyState === 1) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = (async () => {
            const configuredUri = process.env.MONGODB_URI;
            if (!configuredUri || !configuredUri.trim()) {
                const err = new Error('[MONGO] Missing required environment variable: MONGODB_URI');
                console.error(err.message);
                throw err;
            }
            const safeUri = sanitizeMongoUri(configuredUri);
            console.log(`[MONGO] Connecting to database: ${safeUri}`);
            try {
                const conn = await mongoose_1.default.connect(configuredUri, {
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 10000,
                });
                console.log('[MONGO] Connected successfully to persistent MongoDB.');
                await seedControllerAdmin();
                return conn;
            }
            catch (err) {
                // Fallback: If SRV DNS resolution fails (common in serverless/restricted environments), connect via direct replica set nodes
                if ((err.message?.includes('querySrv') || err.message?.includes('ECONNREFUSED') || err.message?.includes('ETIMEDOUT')) &&
                    configuredUri.includes('cluster0.obid4se.mongodb.net')) {
                    console.warn('[MONGO] SRV DNS resolution failed. Retrying with direct replica set hosts...');
                    try {
                        let directUri = configuredUri
                            .replace('mongodb+srv://', 'mongodb://')
                            .replace('cluster0.obid4se.mongodb.net', 'ac-pvbvqlw-shard-00-00.obid4se.mongodb.net:27017,ac-pvbvqlw-shard-00-01.obid4se.mongodb.net:27017,ac-pvbvqlw-shard-00-02.obid4se.mongodb.net:27017');
                        if (!directUri.includes('replicaSet=')) {
                            directUri = directUri.includes('?')
                                ? `${directUri}&ssl=true&replicaSet=atlas-wc41ru-shard-0&authSource=admin`
                                : `${directUri}?ssl=true&replicaSet=atlas-wc41ru-shard-0&authSource=admin`;
                        }
                        const conn = await mongoose_1.default.connect(directUri, {
                            serverSelectionTimeoutMS: 6000,
                            connectTimeoutMS: 10000,
                        });
                        console.log('[MONGO] Connected successfully to persistent MongoDB via direct replica set.');
                        await seedControllerAdmin();
                        return conn;
                    }
                    catch (fallbackErr) {
                        console.error('[MONGO] Direct replica set connection also failed:', fallbackErr.message);
                    }
                }
                // Safe categorization of MongoDB connection errors
                let errorCategory = 'CONNECTION_FAILED';
                if (err.message?.includes('whitelisted') || err.message?.includes('SSL alert') || err.message?.includes('tlsv1 alert')) {
                    errorCategory = 'IP_NOT_WHITELISTED';
                    console.error('[MONGO] MongoDB connection failed: IP address is not whitelisted on MongoDB Atlas Network Access.');
                    console.error('[MONGO] Action needed: Add 0.0.0.0/0 (or current IP) to Atlas Network Access -> IP Access List.');
                }
                else if (err.message?.includes('querySrv') || err.message?.includes('ECONNREFUSED')) {
                    errorCategory = 'DNS_RESOLUTION_FAILED';
                    console.error(`[MONGO] MongoDB connection failed: DNS SRV resolution error (${err.message}).`);
                }
                else if (err.message?.includes('Authentication failed') || err.message?.includes('auth error')) {
                    errorCategory = 'AUTHENTICATION_FAILED';
                    console.error('[MONGO] MongoDB connection failed: Database authentication credentials rejected.');
                }
                else {
                    console.error(`[MONGO] MongoDB connection failed (${errorCategory}):`, err.message);
                }
                const enrichedError = new Error(`[MONGO] MongoDB connection failed (${errorCategory}): ${err.message}`);
                enrichedError.category = errorCategory;
                throw enrichedError;
            }
        })();
    }
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
}
/**
 * Ensures the designated Chief Civic Controller account exists in MongoDB
 * Clean initial start: Exactly ONE Controller Admin.
 */
async function seedControllerAdmin() {
    try {
        const designatedEmail = 'nowfal@gmail.com';
        const fallbackAdminEmail = 'admin@civicplus.tn.gov.in';
        let controller = await User_1.User.findOne({
            $or: [{ email: designatedEmail }, { email: fallbackAdminEmail }],
        });
        if (!controller) {
            const initialHashedPassword = await bcryptjs_1.default.hash('Admin@123', 10);
            const accountNumber = await (0, Counter_1.getNextAccountNumber)();
            controller = await User_1.User.create({
                accountNumber,
                username: 'nowfal',
                name: 'Chief Civic Controller Nowfal',
                email: designatedEmail,
                phone: '+919876543210',
                password: initialHashedPassword,
                role: 'ADMIN',
                location: 'Tamil Nadu State Headquarters',
                avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                approvalStatus: 'APPROVED',
                isApproved: true,
                accountStatus: 'ACTIVE',
                presenceStatus: 'OFFLINE',
                isOnline: false,
                fraudScore: 0,
                isBanned: false,
            });
            console.log(`[MONGO] Seeded Chief Civic Controller Admin: ${designatedEmail} (${accountNumber})`);
        }
        else {
            if (controller.role !== 'ADMIN' || controller.accountStatus !== 'ACTIVE') {
                controller.role = 'ADMIN';
                controller.accountStatus = 'ACTIVE';
                controller.isApproved = true;
                controller.approvalStatus = 'APPROVED';
                await controller.save();
            }
        }
    }
    catch (err) {
        console.error('[MONGO] Error seeding Controller Admin:', err.message);
    }
}
