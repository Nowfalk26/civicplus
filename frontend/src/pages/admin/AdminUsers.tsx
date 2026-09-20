import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { FraudScoreBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

interface UserItem {
  id: string;
  accountNumber?: string;
  username: string;
  name?: string;
  email: string;
  phone: string;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN' | 'EMPLOYEE';
  location: string;
  avatarUrl?: string;
  department?: string | null;
  designation?: string | null;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isApproved?: boolean;
  needsPasswordChange?: boolean;
  fraudScore: number;
  accountStatus: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'DISABLED';
  presenceStatus?: 'ONLINE' | 'OFFLINE';
  isOnline?: boolean;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  successfulLoginCount?: number;
  isBanned: boolean;
  bannedUntil?: string | null;
  reportsCount: number;
  assignedCount: number;
  resolvedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserComplaint {
  id: string;
  complaintId: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [apiStats, setApiStats] = useState<{
    totalCitizens: number;
    totalOfficers: number;
    totalAdmins: number;
    totalReports: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'CITIZEN' | 'OFFICER' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspection Dossier Modal
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userDetails, setUserDetails] = useState<{
    user: UserItem;
    complaints: UserComplaint[];
    assignedComplaints?: UserComplaint[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [manualFraudScore, setManualFraudScore] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Deletion Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?limit=150');
      if (res.data?.success) {
        setUsers(res.data.users || []);
        if (res.data.stats) {
          setApiStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Unable to fetch persisted users.');
    } finally {
      setLoading(false);
    }
  };

  // Live aggregated counts
  const counts = useMemo(() => {
    const total = users.length;
    const citizens = users.filter((u) => u.role === 'CITIZEN').length;
    const officers = users.filter((u) => u.role === 'OFFICER').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const suspended = users.filter((u) => u.isBanned).length;
    const totalReports = users.reduce((acc, u) => acc + (u.reportsCount || 0), 0);
    return {
      total,
      citizens: apiStats?.totalCitizens ?? citizens,
      officers: apiStats?.totalOfficers ?? officers,
      admins: apiStats?.totalAdmins ?? admins,
      suspended,
      totalReports: apiStats?.totalReports ?? totalReports,
    };
  }, [users, apiStats]);

  // Filtered users based on active tab, search, and status filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Tab filter
      if (activeTab !== 'ALL' && u.role !== activeTab) {
        return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && u.isBanned) return false;
      if (statusFilter === 'SUSPENDED' && !u.isBanned) return false;
      if (statusFilter === 'PENDING_APPROVAL' && u.accountStatus !== 'PENDING_APPROVAL') return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (u.name || '').toLowerCase().includes(q);
        const matchesUsername = (u.username || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesPhone = (u.phone || '').includes(q);
        const matchesLocation = (u.location || '').toLowerCase().includes(q);
        const matchesDept = (u.department || '').toLowerCase().includes(q);
        return matchesName || matchesUsername || matchesEmail || matchesPhone || matchesLocation || matchesDept;
      }

      return true;
    });
  }, [users, activeTab, statusFilter, search]);

  const openInspectModal = async (u: UserItem) => {
    setSelectedUser(u);
    setManualFraudScore(u.fraudScore || 0);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/users/${u.id}`);
      if (res.data?.success) {
        setUserDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load full user details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBanToggle = async (isBanned: boolean, days?: number) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}/ban`, {
        isBanned,
        days,
        reason: days
          ? `Administrative suspension (${days} days) for civic policy infraction.`
          : 'Permanent administrative ban.',
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedUser((prev) => (prev ? { ...prev, isBanned, accountStatus: isBanned ? 'SUSPENDED' : 'ACTIVE' } : null));
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id
              ? { ...u, isBanned, accountStatus: isBanned ? 'SUSPENDED' : 'ACTIVE' }
              : u
          )
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ban status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateScore = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}/fraud-score`, {
        fraudScore: manualFraudScore,
        reason: 'Manual score calibration by Controller Super Admin.',
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedUser(res.data.user);
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? res.data.user : u))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to adjust fraud score.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/users/${userToDelete.id}`);
      if (res.data?.success) {
        toast.success(res.data.message || 'User deleted successfully.');
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        if (selectedUser?.id === userToDelete.id) {
          setSelectedUser(null);
        }
        setUserToDelete(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              User Directory & Account Oversight
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Persistent Storage
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
            Real citizen and officer accounts are permanently persisted in the central registry. User accounts and their associated reports remain saved across logins, sessions, and reloads.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant bg-white hover:bg-surface-container-low text-xs font-bold text-on-surface transition-colors shrink-0 shadow-xs"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
            sync
          </span>
          Refresh Directory
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-primary/5 border-primary shadow-xs'
              : 'bg-white border-surface-container hover:border-outline-variant'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Total Accounts
            </span>
            <span className="material-symbols-outlined text-[20px] text-primary">groups</span>
          </div>
          <p className="text-2xl font-black text-on-surface mt-2">{counts.total}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            {counts.totalReports} total civic reports
          </p>
        </div>

        <div
          onClick={() => setActiveTab('CITIZEN')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'CITIZEN'
              ? 'bg-emerald-50 border-emerald-500 shadow-xs'
              : 'bg-white border-surface-container hover:border-outline-variant'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Civic Users
            </span>
            <span className="material-symbols-outlined text-[20px] text-emerald-600">person</span>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{counts.citizens}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            Real registered citizens
          </p>
        </div>

        <div
          onClick={() => setActiveTab('OFFICER')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'OFFICER'
              ? 'bg-blue-50 border-blue-500 shadow-xs'
              : 'bg-white border-surface-container hover:border-outline-variant'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Officers
            </span>
            <span className="material-symbols-outlined text-[20px] text-blue-600">badge</span>
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2">{counts.officers}</p>
          <p className="text-[11px] text-blue-700 mt-0.5">
            Field workforce & inspectors
          </p>
        </div>

        <div
          onClick={() => setActiveTab('ADMIN')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'ADMIN'
              ? 'bg-purple-50 border-purple-500 shadow-xs'
              : 'bg-white border-surface-container hover:border-outline-variant'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
              Controllers
            </span>
            <span className="material-symbols-outlined text-[20px] text-purple-600">shield_person</span>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2">{counts.admins}</p>
          <p className="text-[11px] text-purple-700 mt-0.5">
            System governance
          </p>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-low border border-surface-container text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-white text-on-surface shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Accounts ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CITIZEN')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'CITIZEN'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Civic Users ({counts.citizens})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OFFICER')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'OFFICER'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Officers ({counts.officers})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ADMIN')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ADMIN'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Controllers ({counts.admins})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, phone, district..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant text-xs outline-none bg-white focus:border-primary transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter users by status"
            className="p-2 rounded-xl border border-outline-variant text-xs bg-white font-semibold outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Good Standing</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* Users Content Table / Empty States */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-on-surface-variant font-medium">
              Loading persistent user directory...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                {activeTab === 'CITIZEN' ? 'person_off' : activeTab === 'OFFICER' ? 'badge' : 'search_off'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">
              {activeTab === 'CITIZEN'
                ? 'No Civic Users Registered Yet'
                : activeTab === 'OFFICER'
                ? 'No Officers Registered Yet'
                : 'No Accounts Found'}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {activeTab === 'CITIZEN'
                ? 'The platform starts in a clean state with zero artificial accounts. When real users authenticate using Google OAuth or Phone OTP, their permanent accounts will be saved and listed here.'
                : search || statusFilter !== 'ALL'
                ? 'No user accounts match your search query or status filter. Try clearing your filters.'
                : 'No users registered under this category yet.'}
            </p>
            {(search || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                className="mt-2 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                  <th className="p-3.5 font-bold">User Identity</th>
                  <th className="p-3.5 font-bold">Verified Contact Channels</th>
                  <th className="p-3.5 font-bold">Role & Type</th>
                  <th className="p-3.5 font-bold">District / Dept</th>
                  {activeTab === 'OFFICER' ? (
                    <th className="p-3.5 font-bold">Work Assignments</th>
                  ) : (
                    <th className="p-3.5 font-bold">Reports Filed</th>
                  )}
                  <th className="p-3.5 font-bold">Account Status</th>
                  <th className="p-3.5 font-bold">Registered On</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredUsers.map((u) => {
                  const isGoogleEmail = u.email?.toLowerCase().endsWith('@gmail.com');
                  const hasPhone = Boolean(u.phone && u.phone.length >= 10);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-surface-container-low transition-colors group"
                    >
                      {/* User Identity */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.username}
                                className="w-9 h-9 rounded-full object-cover border border-surface-container"
                                onError={(e) => {
                                  // Fallback to initial avatar on image error
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'OFFICER'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              } ${u.avatarUrl ? 'hidden' : ''}`}
                            >
                              {(u.name || u.username || 'U')[0].toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface flex items-center gap-1.5">
                              {u.name || u.username}
                              {u.role === 'ADMIN' && (
                                <span className="material-symbols-outlined text-purple-600 text-[14px]">
                                  verified
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                @{u.username}
                              </span>
                              {u.accountNumber && (
                                <span className="px-1.5 py-0.2 rounded bg-surface-container text-primary font-mono text-[10px] font-bold border border-surface-container-high" title="Permanent Account Number">
                                  {u.accountNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Verified Contact Channels */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-on-surface">
                            <span className="material-symbols-outlined text-[13px] text-blue-600">
                              mail
                            </span>
                            <span className="truncate max-w-[180px]">{u.email}</span>
                            {isGoogleEmail && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Google
                              </span>
                            )}
                          </div>
                          {hasPhone ? (
                            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[11px]">
                              <span className="material-symbols-outlined text-[13px] text-emerald-600">
                                call
                              </span>
                              <span>{u.phone}</span>
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                OTP Verified
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant italic">
                              No phone registered
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role & Type */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : u.role === 'OFFICER'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : u.role === 'EMPLOYEE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-600'
                                : u.role === 'OFFICER'
                                ? 'bg-blue-600'
                                : u.role === 'EMPLOYEE'
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                          />
                          {u.role === 'CITIZEN' ? 'Civic User' : u.role}
                        </span>
                      </td>

                      {/* District / Department */}
                      <td className="p-3.5">
                        <div>
                          <p className="font-semibold text-on-surface">{u.location || 'Tamil Nadu'}</p>
                          {u.department && (
                            <p className="text-[11px] text-primary font-medium">
                              {u.department}
                              {u.designation ? ` • ${u.designation}` : ''}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Reports Filed / Work Assignments */}
                      <td className="p-3.5">
                        {u.role === 'OFFICER' || u.role === 'EMPLOYEE' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {u.assignedCount || 0} Assigned
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 ml-1">
                              {u.resolvedCount || 0} Resolved
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openInspectModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-container-low hover:bg-primary/10 text-primary border border-surface-container transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              report_problem
                            </span>
                            {u.reportsCount || 0} Reports
                          </button>
                        )}
                      </td>

                      {/* Account Status & Real-time Presence */}
                      <td className="p-3.5">
                        <div className="space-y-1.5">
                          {/* Presence Indicator */}
                          <div>
                            {u.presenceStatus === 'ONLINE' || u.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                ONLINE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                OFFLINE
                              </span>
                            )}
                            <span className="text-[10px] text-on-surface-variant font-mono ml-1.5">
                              {u.successfulLoginCount || 1} logins
                            </span>
                          </div>

                          {/* Account Good Standing / Suspension */}
                          <div>
                            {u.isBanned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                Suspended
                              </span>
                            ) : u.role === 'OFFICER' && (!u.isApproved || u.approvalStatus === 'PENDING') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                Pending Approval
                              </span>
                            ) : u.role === 'OFFICER' && u.approvalStatus === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-300">
                                Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Active Account
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="p-3.5 text-on-surface-variant text-[11px] whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openInspectModal(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white font-bold text-xs transition-colors"
                            title="Inspect dossier & manage"
                          >
                            Inspect
                          </button>

                          {u.role !== 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete account"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Dossier & Enforcement Modal */}
      {selectedUser && (
        <Modal
          isOpen={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          title={`User Dossier: ${selectedUser.name || selectedUser.username}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* Header Identity Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedUser.avatarUrl ? (
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.username}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                    />
                  ) : null}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-base ${
                      selectedUser.role === 'ADMIN'
                        ? 'bg-purple-200 text-purple-900'
                        : selectedUser.role === 'OFFICER'
                        ? 'bg-blue-200 text-blue-900'
                        : 'bg-emerald-200 text-emerald-900'
                    } ${selectedUser.avatarUrl ? 'hidden' : ''}`}
                  >
                    {(selectedUser.name || selectedUser.username || 'U')[0].toUpperCase()}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    {selectedUser.name || selectedUser.username}
                  </h3>
                  <p className="text-on-surface-variant">
                    @{selectedUser.username} • {selectedUser.email}
                  </p>
                  <p className="text-primary font-semibold mt-0.5">
                    District: {selectedUser.location}
                    {selectedUser.department ? ` • ${selectedUser.department}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <FraudScoreBadge score={selectedUser.fraudScore || 0} />
                {selectedUser.isBanned && (
                  <p className="text-[11px] text-red-700 font-bold">
                    Suspended Until:{' '}
                    {selectedUser.bannedUntil
                      ? new Date(selectedUser.bannedUntil).toLocaleDateString('en-IN')
                      : 'Permanent'}
                  </p>
                )}
                <p className="text-[10px] text-on-surface-variant">
                  Registered: {formatDate(selectedUser.createdAt)}
                </p>
              </div>
            </div>

            {/* Non-sensitive Verified Credentials Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-surface-container flex items-center gap-2.5">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">
                  verified_user
                </span>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                    Verified Identity
                  </span>
                  <span className="font-semibold text-on-surface text-xs">
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-surface-container flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                  phone_iphone
                </span>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                    Contact Phone
                  </span>
                  <span className="font-semibold text-on-surface text-xs font-mono">
                    {selectedUser.phone || 'None provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Fraud Score Calibration */}
            <div className="p-4 rounded-2xl border border-surface-container bg-white space-y-2">
              <span className="font-bold text-on-surface block">
                Fraud Risk Calibration (0 - 100)
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manualFraudScore}
                  onChange={(e) => setManualFraudScore(Number(e.target.value))}
                  aria-label="Manual fraud score"
                  className="w-24 p-2 rounded-xl border border-outline-variant font-bold text-sm outline-none focus:border-primary"
                />
                <span className="text-on-surface-variant">
                  (Scores &gt; 80 automatically trigger account suspension)
                </span>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleUpdateScore}
                  className="ml-auto px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors shrink-0"
                >
                  Save Score
                </button>
              </div>
            </div>

            {/* Disciplinary Sanctions */}
            <div className="p-4 rounded-2xl border border-surface-container bg-surface-container-low space-y-3">
              <span className="font-bold text-on-surface block">
                Account Status & Disciplinary Controls
              </span>

              <div className="flex flex-wrap gap-2.5">
                {selectedUser.isBanned ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleBanToggle(false)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
                  >
                    Lift Ban & Reinstate Account
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleBanToggle(true, 7)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs"
                    >
                      Temporary Suspend (7 Days)
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleBanToggle(true)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-xs"
                    >
                      Permanent Ban Account
                    </button>
                  </>
                )}

                {selectedUser.role !== 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => setUserToDelete(selectedUser)}
                    className="ml-auto px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                    Purge Account
                  </button>
                )}
              </div>
            </div>

            {/* User Filing History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface block">
                  Associated Civic Reports ({userDetails?.complaints?.length || 0} Tickets)
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Permanently linked to this account
                </span>
              </div>

              {loadingDetails ? (
                <div className="p-6 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-[20px] text-primary block mx-auto mb-1">
                    progress_activity
                  </span>
                  Loading reports history...
                </div>
              ) : (userDetails?.complaints?.length || 0) === 0 ? (
                <div className="p-4 rounded-xl border border-surface-container bg-surface-container-low text-center text-on-surface-variant">
                  No civic complaints have been recorded by this user yet.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-surface-container rounded-xl divide-y divide-surface-container">
                  {userDetails?.complaints?.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between hover:bg-surface-container-low text-[11px] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">
                            {c.complaintId}
                          </span>
                          <span className="font-semibold text-on-surface">{c.category}</span>
                        </div>
                        <p className="text-on-surface-variant truncate max-w-[280px] mt-0.5">
                          {c.location}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface uppercase">
                          {c.status}
                        </span>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          {formatDate(c.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          title="Confirm Account Deletion"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0 mt-0.5">
                warning
              </span>
              <p className="leading-relaxed">
                Are you sure you want to permanently delete the account for{' '}
                <strong className="font-bold">{userToDelete.name || userToDelete.username}</strong> ({userToDelete.email})?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container font-bold text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors inline-flex items-center gap-1.5"
              >
                {deleteLoading && (
                  <span className="material-symbols-outlined text-[14px] animate-spin">
                    progress_activity
                  </span>
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
