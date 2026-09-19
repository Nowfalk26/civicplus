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



// In-memory fallback repository initialized with seed data
class InMemoryStore {
  public users: UserRecord[] = [];
  public complaints: ComplaintRecord[] = [];
  public initialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.initialized) return;
    const seed = buildSeedData();
    this.users = seed.users;
    this.complaints = seed.complaints;
    this.initialized = true;
    const civicCount = this.users.filter((u) => u.role === 'CITIZEN').length;
    const officerCount = this.users.filter((u) => u.role === 'OFFICER').length;
    console.log(
      `[DATABASE] Fresh start active: ${civicCount} Civic users, ${officerCount} Officer users, ${this.complaints.length} Complaints. Sole Controller initialized.`
    );
  }

  public resetToCleanState() {
    const seed = buildSeedData();
    this.users = [...seed.users];
    this.complaints = [];
    console.log('[DATABASE] In-memory store reset to clean state (0 Civic, 0 Officers, 0 Reports).');
  }

  // User operations
  findUserByEmailOrPhone(identifier: string): UserRecord | undefined {
    return this.users.find(
      (u) =>
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.phone === identifier ||
        u.username.toLowerCase() === identifier.toLowerCase()
    );
  }

  findUserById(id: string): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  createUser(data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt' | 'fraudScore' | 'isBanned'> & Partial<UserRecord>): UserRecord {
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
    return this.users[idx];
  }

  deleteUser(id: string): boolean {
    const initialLen = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    return this.users.length < initialLen;
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

    // Sort by createdAt desc
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = result.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return {
      complaints: result.slice(offset, offset + limit),
      total,
    };
  }

  createComplaint(complaint: Omit<ComplaintRecord, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'fraudFlags' | 'photos'> & {
    photos?: { url: string; type: 'BEFORE' | 'AFTER' | 'EVIDENCE' }[];
  }): ComplaintRecord {
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
    return this.complaints[idx];
  }

  deleteComplaint(id: string): boolean {
    const initialLen = this.complaints.length;
    this.complaints = this.complaints.filter((c) => c.id !== id && c.complaintId !== id);
    return this.complaints.length < initialLen;
  }

  addTimeline(complaintId: string, entry: Omit<TimelineRecord, 'id' | 'complaintId' | 'timestamp'> & { timestamp?: string }) {
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
    return photo;
  }

  // Officer queries using existing User store (No new database storage)
  findOfficers(options?: { pendingOnly?: boolean; activeOnly?: boolean }): UserRecord[] {
    return this.users.filter((u) => {
      if (u.role !== 'OFFICER') return false;
      if (options?.pendingOnly) return u.isBanned === true;
      if (options?.activeOnly) return u.isBanned === false;
      return true;
    });
  }
}

export const inMemoryDb = new InMemoryStore();

