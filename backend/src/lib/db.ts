import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { User } from '../models/User';
import { getNextAccountNumber } from '../models/Counter';

// Configure public DNS servers for SRV query resolution with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: CachedConnection | undefined;
  // eslint-disable-next-line no-var
  var mongoMemoryServerInstance: any | undefined;
}

let cached: CachedConnection = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

// Direct replica set connection string (bypasses SRV lookup for 100% reliability on Vercel/Lambda/Windows/Linux)
export const DIRECT_ATLAS_URI =
  'mongodb://nowfal0326_db_user:k1982n2007@ac-pvbvqlw-shard-00-00.obid4se.mongodb.net:27017,ac-pvbvqlw-shard-00-01.obid4se.mongodb.net:27017,ac-pvbvqlw-shard-00-02.obid4se.mongodb.net:27017/civicsplus?ssl=true&replicaSet=atlas-wc41ru-shard-0&authSource=admin&retryWrites=true&w=majority';

export const SRV_ATLAS_URI =
  'mongodb+srv://nowfal0326_db_user:k1982n2007@cluster0.obid4se.mongodb.net/civicsplus?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Initializes and ensures the single persistent MongoDB connection.
 * Supports primary external/Atlas URI or disk-persisted embedded runner fallback.
 */
export async function connectDb(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      const configuredUri = process.env.MONGODB_URI;

      // 1. If custom configured URI is provided, try that first
      if (configuredUri && configuredUri.trim()) {
        try {
          const conn = await mongoose.connect(configuredUri, {
            serverSelectionTimeoutMS: 5000,
          });
          console.log(`✔ Connected to MongoDB (custom URI): ${configuredUri.replace(/\/\/.*@/, '//***@')}`);
          await seedControllerAdmin();
          return conn;
        } catch (err: any) {
          console.warn(`⚠ Custom MONGODB_URI failed (${err.message}). Trying direct Atlas replica set.`);
        }
      }

      // 2. Direct Atlas connection (fastest, most reliable on all platforms, no SRV DNS lookup issues)
      try {
        const conn = await mongoose.connect(DIRECT_ATLAS_URI, {
          serverSelectionTimeoutMS: 6000,
        });
        console.log(`✔ Connected to MongoDB Atlas (Direct Replica Set): civicsplus`);
        await seedControllerAdmin();
        return conn;
      } catch (directErr: any) {
        console.warn(`⚠ Direct Atlas connection failed (${directErr.message}). Trying SRV URI.`);
      }

      // 3. SRV Atlas connection attempt
      try {
        const conn = await mongoose.connect(SRV_ATLAS_URI, {
          serverSelectionTimeoutMS: 6000,
        });
        console.log(`✔ Connected to MongoDB Atlas (SRV): civicsplus`);
        await seedControllerAdmin();
        return conn;
      } catch (srvErr: any) {
        console.warn(`⚠ SRV Atlas connection failed (${srvErr.message}).`);
      }

      // 4. Fallback: Embedded MongoDB (Only on local machine, never on Vercel/serverless)
      if (!process.env.VERCEL) {
        try {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          if (!global.mongoMemoryServerInstance) {
            const persistentDbDir = path.resolve(__dirname, '../../data/mongodb_data');
            if (!fs.existsSync(persistentDbDir)) {
              fs.mkdirSync(persistentDbDir, { recursive: true });
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
          const conn = await mongoose.connect(embeddedUri);
          console.log(`✔ Connected to Persistent Local MongoDB (WiredTiger on-disk) at: ${embeddedUri}`);
          await seedControllerAdmin();
          return conn;
        } catch (embeddedErr: any) {
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
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

/**
 * Ensures the designated Chief Civic Controller account exists in MongoDB
 * Clean initial start: Exactly ONE Controller Admin, 0 Civic Users, 0 Officers, 0 Reports.
 */
export async function seedControllerAdmin(): Promise<void> {
  try {
    const designatedEmail = 'nowfal@gmail.com';
    const fallbackAdminEmail = 'admin@civicplus.tn.gov.in';

    let controller = await User.findOne({
      $or: [{ email: designatedEmail }, { email: fallbackAdminEmail }],
    });

    if (!controller) {
      const initialHashedPassword = await bcrypt.hash('Admin@123', 10);
      const accountNumber = await getNextAccountNumber();

      controller = await User.create({
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
    } else {
      // Ensure role is ADMIN and accountStatus is ACTIVE
      if (controller.role !== 'ADMIN' || controller.accountStatus !== 'ACTIVE') {
        controller.role = 'ADMIN';
        controller.accountStatus = 'ACTIVE';
        controller.isApproved = true;
        controller.approvalStatus = 'APPROVED';
        await controller.save();
      }
    }
  } catch (err: any) {
    console.error('Error seeding Controller Admin:', err.message);
  }
}
