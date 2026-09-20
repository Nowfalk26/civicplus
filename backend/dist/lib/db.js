"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SRV_ATLAS_URI = exports.DIRECT_ATLAS_URI = void 0;
exports.connectDb = connectDb;
exports.seedControllerAdmin = seedControllerAdmin;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dns_1 = __importDefault(require("dns"));
const User_1 = require("../models/User");
const Counter_1 = require("../models/Counter");
// Configure public DNS servers for SRV query resolution with MongoDB Atlas
try {
    dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
}
catch { }
let cached = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
    global.mongooseCache = cached;
}
// Direct replica set connection string (bypasses SRV lookup for 100% reliability on Vercel/Lambda/Windows/Linux)
exports.DIRECT_ATLAS_URI = 'mongodb://nowfal0326_db_user:k1982n2007@ac-pvbvqlw-shard-00-00.obid4se.mongodb.net:27017,ac-pvbvqlw-shard-00-01.obid4se.mongodb.net:27017,ac-pvbvqlw-shard-00-02.obid4se.mongodb.net:27017/civicsplus?ssl=true&replicaSet=atlas-wc41ru-shard-0&authSource=admin&retryWrites=true&w=majority';
exports.SRV_ATLAS_URI = 'mongodb+srv://nowfal0326_db_user:k1982n2007@cluster0.obid4se.mongodb.net/civicsplus?retryWrites=true&w=majority&appName=Cluster0';
/**
 * Initializes and ensures the single persistent MongoDB connection.
 * Supports primary external/Atlas URI or disk-persisted embedded runner fallback.
 */
async function connectDb() {
    if (cached.conn && mongoose_1.default.connection.readyState === 1) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = (async () => {
            const configuredUri = process.env.MONGODB_URI;
            // 1. If custom configured URI is provided, try that first
            if (configuredUri && configuredUri.trim()) {
                try {
                    const conn = await mongoose_1.default.connect(configuredUri, {
                        serverSelectionTimeoutMS: 5000,
                    });
                    console.log(`✔ Connected to MongoDB (custom URI): ${configuredUri.replace(/\/\/.*@/, '//***@')}`);
                    await seedControllerAdmin();
                    return conn;
                }
                catch (err) {
                    console.warn(`⚠ Custom MONGODB_URI failed (${err.message}). Trying direct Atlas replica set.`);
                }
            }
            // 2. Direct Atlas connection (fastest, most reliable on all platforms, no SRV DNS lookup issues)
            try {
                const conn = await mongoose_1.default.connect(exports.DIRECT_ATLAS_URI, {
                    serverSelectionTimeoutMS: 6000,
                });
                console.log(`✔ Connected to MongoDB Atlas (Direct Replica Set): civicsplus`);
                await seedControllerAdmin();
                return conn;
            }
            catch (directErr) {
                console.warn(`⚠ Direct Atlas connection failed (${directErr.message}). Trying SRV URI.`);
            }
            // 3. SRV Atlas connection attempt
            try {
                const conn = await mongoose_1.default.connect(exports.SRV_ATLAS_URI, {
                    serverSelectionTimeoutMS: 6000,
                });
                console.log(`✔ Connected to MongoDB Atlas (SRV): civicsplus`);
                await seedControllerAdmin();
                return conn;
            }
            catch (srvErr) {
                console.warn(`⚠ SRV Atlas connection failed (${srvErr.message}).`);
            }
            // 4. Fallback: Embedded MongoDB (Only on local machine, never on Vercel/serverless)
            if (!process.env.VERCEL) {
                try {
                    const { MongoMemoryServer } = await Promise.resolve().then(() => __importStar(require('mongodb-memory-server')));
                    if (!global.mongoMemoryServerInstance) {
                        const persistentDbDir = path_1.default.resolve(__dirname, '../../data/mongodb_data');
                        if (!fs_1.default.existsSync(persistentDbDir)) {
                            fs_1.default.mkdirSync(persistentDbDir, { recursive: true });
                        }
                        global.mongoMemoryServerInstance = await MongoMemoryServer.create({
                            instance: {
                                dbPath: persistentDbDir,
                                storageEngine: 'wiredTiger',
                                dbName: 'civicsplus',
                            },
                        });
                    }
                    const embeddedUri = global.mongoMemoryServerInstance.getUri('civicsplus');
                    const conn = await mongoose_1.default.connect(embeddedUri);
                    console.log(`✔ Connected to Persistent Local MongoDB (WiredTiger on-disk) at: ${embeddedUri}`);
                    await seedControllerAdmin();
                    return conn;
                }
                catch (embeddedErr) {
                    console.error('CRITICAL: Failed to initialize persistent MongoDB:', embeddedErr);
                    throw embeddedErr;
                }
            }
            throw new Error('Could not connect to MongoDB Atlas and local fallback is disabled on Vercel.');
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
 * Clean initial start: Exactly ONE Controller Admin, 0 Civic Users, 0 Officers, 0 Reports.
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
            console.log(`✔ Chief Civic Controller Admin seeded permanently: ${designatedEmail} (${accountNumber})`);
        }
        else {
            // Ensure role is ADMIN and accountStatus is ACTIVE
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
        console.error('Error seeding Controller Admin:', err.message);
    }
}
