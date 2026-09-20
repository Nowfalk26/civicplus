"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMemoryDb = exports.prisma = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const seedData_1 = require("../data/seedData");
// Safe lazy Prisma Client instantiation that never crashes serverless environments
let prismaInstance = null;
exports.prisma = new Proxy({}, {
    get(_target, prop) {
        if (!prismaInstance) {
            try {
                const { PrismaClient } = require('@prisma/client');
                prismaInstance = new PrismaClient();
            }
            catch {
                prismaInstance = {};
            }
        }
        return prismaInstance[prop];
    },
});
/**
 * Persistent Data Store
 * Persists registered users and complaints to a durable JSON database file on disk.
 * Accounts, sessions, and reports are NEVER wiped when users log out, close tabs, or restart.
 * Starts clean (0 Civic users, 0 Officers, 0 Reports, 1 Controller Admin) on initial fresh run.
 */
class PersistentStore {
    users = [];
    complaints = [];
    initialized = false;
    dbFilePath = '';
    cloudStoreUrl = process.env.CLOUD_STORE_URL || 'https://extendsclass.com/api/json-storage/bin/dccfafd';
    lastSyncedAt = 0;
    syncPromise = null;
    constructor() {
        this.resolveDbPath();
        this.init();
    }
    resolveDbPath() {
        try {
            if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
                this.dbFilePath = path_1.default.join('/tmp', 'civicplus_persisted_db.json');
                return this.dbFilePath;
            }
            const primaryDir = path_1.default.resolve(__dirname, '../data');
            if (!fs_1.default.existsSync(primaryDir)) {
                fs_1.default.mkdirSync(primaryDir, { recursive: true });
            }
            this.dbFilePath = path_1.default.join(primaryDir, 'persisted_db.json');
        }
        catch {
            this.dbFilePath = path_1.default.join('/tmp', 'civicplus_persisted_db.json');
        }
        return this.dbFilePath;
    }
    async ensureSynced(force = false) {
        if (!this.cloudStoreUrl)
            return;
        // Cache window: avoid re-fetching within 2 seconds unless forced
        if (!force && Date.now() - this.lastSyncedAt < 2000) {
            return;
        }
        if (this.syncPromise) {
            return this.syncPromise;
        }
        this.syncPromise = (async () => {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(this.cloudStoreUrl, { signal: controller.signal });
                clearTimeout(timer);
                if (res.ok) {
                    const remote = (await res.json());
                    if (Array.isArray(remote.users)) {
                        const userMap = new Map();
                        this.users.forEach((u) => userMap.set(u.id, u));
                        remote.users.forEach((ru) => {
                            const existing = userMap.get(ru.id);
                            if (!existing || new Date(ru.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
                                userMap.set(ru.id, ru);
                            }
                        });
                        this.users = Array.from(userMap.values());
                    }
                    if (Array.isArray(remote.complaints)) {
                        const cmpMap = new Map();
                        this.complaints.forEach((c) => cmpMap.set(c.id, c));
                        remote.complaints.forEach((rc) => {
                            const existing = cmpMap.get(rc.id);
                            if (!existing || new Date(rc.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
                                cmpMap.set(rc.id, rc);
                            }
                        });
                        this.complaints = Array.from(cmpMap.values());
                    }
                    this.lastSyncedAt = Date.now();
                }
            }
            catch (err) {
                console.warn('[DATABASE] Cloud sync fetch warning:', err.message);
            }
            finally {
                this.syncPromise = null;
            }
        })();
        return this.syncPromise;
    }
    async init() {
        if (this.initialized)
            return;
        let loadedFromDisk = false;
        try {
            const targetPath = this.dbFilePath || this.resolveDbPath();
            const pathsToCheck = [
                targetPath,
                path_1.default.join('/tmp', 'civicplus_persisted_db.json'),
            ];
            for (const p of pathsToCheck) {
                if (fs_1.default.existsSync(p)) {
                    const raw = fs_1.default.readFileSync(p, 'utf-8');
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed.users)) {
                        this.users = parsed.users;
                        this.complaints = Array.isArray(parsed.complaints) ? parsed.complaints : [];
                        loadedFromDisk = true;
                        break;
                    }
                }
            }
        }
        catch (err) {
            console.warn('[DATABASE] Local persistent store read notice:', err.message);
        }
        // Trigger initial cloud synchronization
        this.ensureSynced(true).catch(() => { });
        // Ensure Controller admin seed user is present
        const seed = (0, seedData_1.buildSeedData)();
        const adminSeed = seed.users.find((u) => u.role === 'ADMIN');
        if (adminSeed && !this.users.some((u) => u.email.toLowerCase() === adminSeed.email.toLowerCase())) {
            this.users.push(adminSeed);
            this.persist();
        }
        this.initialized = true;
        const civicCount = this.users.filter((u) => u.role === 'CITIZEN').length;
        const officerCount = this.users.filter((u) => u.role === 'OFFICER').length;
        console.log(`[DATABASE] Persistence active (${loadedFromDisk ? 'restored from cache' : 'cloud synchronized'}): ${civicCount} Civic users, ${officerCount} Officer users, ${this.complaints.length} Complaints.`);
    }
    persist() {
        try {
            const targetPath = this.dbFilePath || this.resolveDbPath();
            const payload = JSON.stringify({
                users: this.users,
                complaints: this.complaints,
                updatedAt: new Date().toISOString(),
            }, null, 2);
            // 1. Write to local cache / /tmp
            try {
                fs_1.default.writeFileSync(targetPath, payload, 'utf-8');
            }
            catch {
                try {
                    fs_1.default.writeFileSync(path_1.default.join('/tmp', 'civicplus_persisted_db.json'), payload, 'utf-8');
                }
                catch { }
            }
            // 2. Write to Cloud Store asynchronously
            if (this.cloudStoreUrl) {
                fetch(this.cloudStoreUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                })
                    .then(() => {
                    this.lastSyncedAt = Date.now();
                })
                    .catch((err) => {
                    console.warn('[DATABASE] Notice: Error writing to cloud store:', err.message);
                });
            }
        }
        catch (err) {
            console.warn('[DATABASE] Notice: Error writing persisted state:', err.message);
        }
    }
    async persistAsync() {
        this.persist();
        if (!this.cloudStoreUrl)
            return;
        try {
            const payload = JSON.stringify({
                users: this.users,
                complaints: this.complaints,
                updatedAt: new Date().toISOString(),
            }, null, 2);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            await fetch(this.cloudStoreUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                signal: controller.signal,
            });
            clearTimeout(timer);
            this.lastSyncedAt = Date.now();
        }
        catch (err) {
            console.warn('[DATABASE] Cloud store write warning:', err.message);
        }
    }
    resetToCleanState() {
        const seed = (0, seedData_1.buildSeedData)();
        this.users = [...seed.users];
        this.complaints = [];
        this.persist();
        console.log('[DATABASE] Store reset to clean state (0 Civic, 0 Officers, 0 Reports, 1 Controller).');
    }
    // User operations
    findUserByEmailOrPhone(identifier) {
        const clean = identifier.trim().toLowerCase();
        return this.users.find((u) => u.email.toLowerCase() === clean ||
            u.phone === identifier ||
            u.username.toLowerCase() === clean ||
            (u.authProviderUserId && u.authProviderUserId === identifier));
    }
    findUserByAuthProviderId(authProviderUserId) {
        if (!authProviderUserId)
            return undefined;
        return this.users.find((u) => u.authProviderUserId === authProviderUserId);
    }
    findUserById(id) {
        return this.users.find((u) => u.id === id);
    }
    createUser(data) {
        const isOfficer = (data.role || 'CITIZEN') === 'OFFICER';
        const cleanEmail = data.email.trim().toLowerCase();
        const newUser = {
            id: data.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            username: data.username,
            name: data.name || data.username,
            email: cleanEmail,
            phone: data.phone,
            password: data.password || '',
            role: data.role || 'CITIZEN',
            authProviderUserId: data.authProviderUserId || null,
            location: data.location || 'Tamil Nadu',
            avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            department: data.department,
            designation: data.designation,
            governmentIdProof: data.governmentIdProof,
            idProofType: data.idProofType,
            requestReason: data.requestReason,
            approvalStatus: data.approvalStatus || (isOfficer ? 'PENDING' : 'APPROVED'),
            isApproved: data.isApproved !== undefined ? data.isApproved : (isOfficer ? false : true),
            needsPasswordChange: data.needsPasswordChange !== undefined ? data.needsPasswordChange : (isOfficer ? true : false),
            approvedAt: data.approvedAt || null,
            approvedById: data.approvedById || null,
            decisionNotes: data.decisionNotes || null,
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
    updateUser(id, data) {
        const idx = this.users.findIndex((u) => u.id === id);
        if (idx === -1)
            return null;
        this.users[idx] = {
            ...this.users[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.persist();
        return this.users[idx];
    }
    deleteUser(id) {
        const initialLen = this.users.length;
        this.users = this.users.filter((u) => u.id !== id);
        const deleted = this.users.length < initialLen;
        if (deleted)
            this.persist();
        return deleted;
    }
    // Complaint operations
    findComplaintById(id) {
        return this.complaints.find((c) => c.id === id || c.complaintId === id);
    }
    findComplaints(filters) {
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
            result = result.filter((c) => c.complaintId.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.location.toLowerCase().includes(q));
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
    createComplaint(complaint) {
        const id = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const photoRecords = (complaint.photos || []).map((p, i) => ({
            id: `pht-${Date.now()}-${i}`,
            url: p.url,
            type: p.type,
            complaintId: id,
            uploadedAt: now,
        }));
        const timelineRecords = [
            {
                id: `tml-${Date.now()}-1`,
                stage: 'SUBMITTED',
                timestamp: now,
                notes: 'Complaint registered by citizen via Civics Plus Portal.',
                complaintId: id,
            },
        ];
        const newRecord = {
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
    updateComplaint(id, data) {
        const idx = this.complaints.findIndex((c) => c.id === id || c.complaintId === id);
        if (idx === -1)
            return null;
        this.complaints[idx] = {
            ...this.complaints[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.persist();
        return this.complaints[idx];
    }
    deleteComplaint(id) {
        const initialLen = this.complaints.length;
        this.complaints = this.complaints.filter((c) => c.id !== id && c.complaintId !== id);
        const deleted = this.complaints.length < initialLen;
        if (deleted)
            this.persist();
        return deleted;
    }
    addTimeline(complaintId, entry) {
        const cmp = this.findComplaintById(complaintId);
        if (!cmp)
            return null;
        const timelineEntry = {
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
    addFraudFlag(complaintId, reason, score) {
        const cmp = this.findComplaintById(complaintId);
        if (!cmp)
            return null;
        const flag = {
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
    addPhoto(complaintId, url, type) {
        const cmp = this.findComplaintById(complaintId);
        if (!cmp)
            return null;
        const photo = {
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
    findOfficers(options) {
        return this.users.filter((u) => {
            if (u.role !== 'OFFICER')
                return false;
            if (options?.pendingOnly)
                return u.isBanned === true;
            if (options?.activeOnly)
                return u.isBanned === false;
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
exports.inMemoryDb = new PersistentStore();
