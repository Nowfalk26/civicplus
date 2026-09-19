import fs from 'fs';
import path from 'path';
import {
  buildSeedData,
  UserRecord,
  ComplaintRecord,
  PhotoRecord,
  TimelineRecord,
  FraudFlagRecord,
} from '../data/seedData';

// Safe lazy Prisma Client instantiation that never crashes serverless environments
let prismaInstance: any = null;
export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!prismaInstance) {
        try {
          const { PrismaClient } = require('@prisma/client');
          prismaInstance = new PrismaClient();
        } catch {
          prismaInstance = {};
        }
      }
      return prismaInstance[prop];
    },
  }
);

/**
 * Persistent Data Store
 * Persists registered users and complaints to a durable JSON database file on disk.
 * Accounts, sessions, and reports are NEVER wiped when users log out, close tabs, or restart.
 * Starts clean (0 Civic users, 0 Officers, 0 Reports, 1 Controller Admin) on initial fresh run.
 */
class PersistentStore {
  public users: UserRecord[] = [];
  public complaints: ComplaintRecord[] = [];
  public initialized = false;
  private dbFilePath: string = '';

  constructor() {
    this.resolveDbPath();
    this.init();
  }

  private resolveDbPath(): string {
    try {
      const primaryDir = path.resolve(__dirname, '../data');
      if (!fs.existsSync(primaryDir)) {
        fs.mkdirSync(primaryDir, { recursive: true });
      }
      this.dbFilePath = path.join(primaryDir, 'persisted_db.json');
    } catch {
      // Fallback for restricted/serverless environments
      this.dbFilePath = path.join(process.cwd(), 'persisted_db.json');
    }
    return this.dbFilePath;
  }

  public init() {
    if (this.initialized) return;

    let loadedFromDisk = false;
    try {
      const targetPath = this.dbFilePath || this.resolveDbPath();
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users)) {
          this.users = parsed.users;
          this.complaints = Array.isArray(parsed.complaints) ? parsed.complaints : [];
          loadedFromDisk = true;
        }
      }
    } catch (err: any) {
      console.warn('[DATABASE] Persistent store read warning:', err.message);
    }

    if (!loadedFromDisk) {
      // Clean initial state (Requirement 15: 0 Civic users, 0 Officers, 0 Reports, 1 Controller)
      const seed = buildSeedData();
      this.users = [...seed.users];
      this.complaints = [];
      this.persist();
    } else {
      // Ensure the designated Controller admin account exists without wiping real users
      const seed = buildSeedData();
      const adminSeed = seed.users.find((u) => u.role === 'ADMIN');
      if (adminSeed && !this.users.some((u) => u.email.toLowerCase() === adminSeed.email.toLowerCase())) {
        this.users.push(adminSeed);
        this.persist();
      }
    }

    this.initialized = true;
    const civicCount = this.users.filter((u) => u.role === 'CITIZEN').length;
    const officerCount = this.users.filter((u) => u.role === 'OFFICER').length;
    console.log(
      `[DATABASE] Persistence active (${loadedFromDisk ? 'restored from disk' : 'fresh initialization'}): ${civicCount} Civic users, ${officerCount} Officer users, ${this.complaints.length} Complaints.`
    );
  }

  public persist() {
    try {
      const targetPath = this.dbFilePath || this.resolveDbPath();
      const payload = JSON.stringify(
        {
          users: this.users,
          complaints: this.complaints,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      );
      fs.writeFileSync(targetPath, payload, 'utf-8');

      // Mirror to /tmp on serverless environments if primary is different
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        try {
          fs.writeFileSync(path.join('/tmp', 'civicplus_persisted_db.json'), payload, 'utf-8');
        } catch {}
      }
    } catch (err: any) {
      console.warn('[DATABASE] Notice: Error writing persisted state to disk:', err.message);
    }
  }

  public resetToCleanState() {
    const seed = buildSeedData();
    this.users = [...seed.users];
    this.complaints = [];
    this.persist();
    console.log('[DATABASE] Store reset to clean state (0 Civic, 0 Officers, 0 Reports, 1 Controller).');
  }

  // User operations
  findUserByEmailOrPhone(identifier: string): UserRecord | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.phone === identifier ||
        u.username.toLowerCase() === clean
    );
  }

  findUserById(id: string): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  createUser(
    data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt' | 'fraudScore' | 'isBanned'> &
      Partial<UserRecord>
  ): UserRecord {
    const newUser: UserRecord = {
      id: data.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: data.username,
      name: data.name || data.username,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: data.role || 'CITIZEN',
      location: data.location,
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      department: data.department,
      designation: data.designation,
      fraudScore: data.fraudScore || 0,
      isBanned: data.isBanned || false,
      bannedUntil: data.bannedUntil || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.persist();
    return newUser;
  }

  updateUser(id: string, data: Partial<UserRecord>): UserRecord | null {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = {
      ...this.users[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.users[idx];
  }

  deleteUser(id: string): boolean {
    const initialLen = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    const deleted = this.users.length < initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  // Complaint operations
  findComplaintById(id: string): ComplaintRecord | undefined {
    return this.complaints.find((c) => c.id === id || c.complaintId === id);
  }

  findComplaints(filters: {
    status?: string;
    category?: string;
    search?: string;
    reportedById?: string;
    assignedToId?: string;
    limit?: number;
    offset?: number;
  }): { complaints: ComplaintRecord[]; total: number } {
    let result = [...this.complaints];

    if (filters.status && filters.status !== 'ALL') {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters.category && filters.category !== 'ALL') {
      result = result.filter((c) => c.category === filters.category);
    }
    if (filters.reportedById) {
      result = result.filter((c) => c.reportedById === filters.reportedById);
    }
    if (filters.assignedToId) {
      result = result.filter((c) => c.assignedToId === filters.assignedToId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.complaintId.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = result.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return {
      complaints: result.slice(offset, offset + limit),
      total,
    };
  }

  createComplaint(
    complaint: Omit<
      ComplaintRecord,
      'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'fraudFlags' | 'photos'
    > & {
      photos?: { url: string; type: 'BEFORE' | 'AFTER' | 'EVIDENCE' }[];
    }
  ): ComplaintRecord {
    const id = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const photoRecords: PhotoRecord[] = (complaint.photos || []).map((p, i) => ({
      id: `pht-${Date.now()}-${i}`,
      url: p.url,
      type: p.type,
      complaintId: id,
      uploadedAt: now,
    }));

    const timelineRecords: TimelineRecord[] = [
      {
        id: `tml-${Date.now()}-1`,
        stage: 'SUBMITTED',
        timestamp: now,
        notes: 'Complaint registered by citizen via Civics Plus Portal.',
        complaintId: id,
      },
    ];

    const newRecord: ComplaintRecord = {
      ...complaint,
      id,
      rejectionReason: null,
      assignedAt: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      photos: photoRecords,
      timeline: timelineRecords,
      fraudFlags: [],
    };

    this.complaints.unshift(newRecord);
    this.persist();
    return newRecord;
  }

  updateComplaint(id: string, data: Partial<ComplaintRecord>): ComplaintRecord | null {
    const idx = this.complaints.findIndex((c) => c.id === id || c.complaintId === id);
    if (idx === -1) return null;

    this.complaints[idx] = {
      ...this.complaints[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.complaints[idx];
  }

  deleteComplaint(id: string): boolean {
    const initialLen = this.complaints.length;
    this.complaints = this.complaints.filter((c) => c.id !== id && c.complaintId !== id);
    const deleted = this.complaints.length < initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  addTimeline(
    complaintId: string,
    entry: Omit<TimelineRecord, 'id' | 'complaintId' | 'timestamp'> & { timestamp?: string }
  ) {
    const cmp = this.findComplaintById(complaintId);
    if (!cmp) return null;
    const timelineEntry: TimelineRecord = {
      id: `tml-${Date.now()}`,
      stage: entry.stage,
      officerName: entry.officerName,
      notes: entry.notes,
      timestamp: entry.timestamp || new Date().toISOString(),
      complaintId: cmp.id,
    };
    cmp.timeline.push(timelineEntry);
    this.persist();
    return timelineEntry;
  }

  addFraudFlag(complaintId: string, reason: string, score: number) {
    const cmp = this.findComplaintById(complaintId);
    if (!cmp) return null;
    const flag: FraudFlagRecord = {
      id: `frd-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      reason,
      score,
      complaintId: cmp.id,
      createdAt: new Date().toISOString(),
    };
    cmp.fraudFlags.push(flag);
    this.persist();
    return flag;
  }

  addPhoto(complaintId: string, url: string, type: 'BEFORE' | 'AFTER' | 'EVIDENCE') {
    const cmp = this.findComplaintById(complaintId);
    if (!cmp) return null;
    const photo: PhotoRecord = {
      id: `pht-${Date.now()}`,
      url,
      type,
      complaintId: cmp.id,
      uploadedAt: new Date().toISOString(),
    };
    cmp.photos.push(photo);
    this.persist();
    return photo;
  }

  findOfficers(options?: { pendingOnly?: boolean; activeOnly?: boolean }): UserRecord[] {
    return this.users.filter((u) => {
      if (u.role !== 'OFFICER') return false;
      if (options?.pendingOnly) return u.isBanned === true;
      if (options?.activeOnly) return u.isBanned === false;
      return true;
    });
  }

  getStats() {
    return {
      citizensCount: this.users.filter((u) => u.role === 'CITIZEN').length,
      officersCount: this.users.filter((u) => u.role === 'OFFICER').length,
      adminsCount: this.users.filter((u) => u.role === 'ADMIN').length,
      complaintsCount: this.complaints.length,
    };
  }
}

export const inMemoryDb = new PersistentStore();
