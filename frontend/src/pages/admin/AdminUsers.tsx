import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { FraudScoreBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Score override
  const [manualFraudScore, setManualFraudScore] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?limit=100');
      if (res.data?.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openInspectModal = async (u: any) => {
    setSelectedUser(u);
    setManualFraudScore(u.fraudScore || 0);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/users/${u.id}`);
      if (res.data?.success) {
        setUserDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load full user dossier.');
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
        setSelectedUser(res.data.user);
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? res.data.user : u))
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
        reason: 'Manual score calibration by Super Admin.',
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedUser(res.data.user);
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? res.data.user : u))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to adjust score.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">User Directory & Enforcement</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Audit citizen accounts, monitor fraud scores, and apply disciplinary suspensions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant text-xs outline-none bg-white focus:border-primary"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2 rounded-xl border border-outline-variant text-xs bg-white font-semibold outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="CITIZEN">Citizens</option>
            <option value="OFFICER">Officers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low text-xs">
          <span className="font-bold text-on-surface">Showing {filtered.length} Accounts</span>
          <span className="text-on-surface-variant">Click row to open enforcement panel</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                <th className="p-3 font-bold">User</th>
                <th className="p-3 font-bold">Role</th>
                <th className="p-3 font-bold">Contact Phone</th>
                <th className="p-3 font-bold">District</th>
                <th className="p-3 font-bold">Fraud Score</th>
                <th className="p-3 font-bold">Account State</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openInspectModal(u)}
                  className="hover:bg-surface-container-low cursor-pointer transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          u.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                        }
                        alt={u.username}
                        className="w-8 h-8 rounded-full object-cover border border-surface-container shrink-0"
                      />
                      <div>
                        <p className="font-bold text-on-surface">{u.username}</p>
                        <p className="text-[11px] text-on-surface-variant">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : u.role === 'OFFICER'
                          ? 'bg-blue-50 text-primary border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-on-surface font-mono">{u.phone}</td>
                  <td className="p-3 text-on-surface">{u.location}</td>
                  <td className="p-3">
                    <FraudScoreBadge score={u.fraudScore || 0} showText={false} />
                  </td>
                  <td className="p-3">
                    {u.isBanned ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active Good Standing
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white font-bold text-xs transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Dossier & Enforcement Modal */}
      {selectedUser && (
        <Modal
          isOpen={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          title={`Enforcement Dossier: ${selectedUser.username}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs">
            {/* User Overview Header */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt={selectedUser.username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <h3 className="text-base font-bold text-on-surface">{selectedUser.username}</h3>
                  <p className="text-on-surface-variant">
                    {selectedUser.email} • {selectedUser.phone}
                  </p>
                  <p className="text-primary font-semibold mt-0.5">
                    District: {selectedUser.location}
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
              </div>
            </div>

            {/* Manual Fraud Score Calibration */}
            <div className="p-4 rounded-2xl border border-surface-container bg-white space-y-2">
              <span className="font-bold text-on-surface block">
                Adjust Fraud Risk Points (Manual Calibration)
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manualFraudScore}
                  onChange={(e) => setManualFraudScore(Number(e.target.value))}
                  className="w-24 p-2 rounded-xl border border-outline-variant font-bold text-sm outline-none focus:border-primary"
                />
                <span className="text-on-surface-variant">
                  (Scores &gt; 80 points automatically invoke 7-day user suspension)
                </span>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleUpdateScore}
                  className="ml-auto px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs transition-colors"
                >
                  Save Score
                </button>
              </div>
            </div>

            {/* Disciplinary Action Triggers */}
            <div className="p-4 rounded-2xl border border-surface-container bg-surface-container-low space-y-3">
              <span className="font-bold text-on-surface block">
                Administrative Sanctions & Account Status
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

                    <button
                      type="button"
                      onClick={() => toast.success('Formal warning dispatch logged to SMS.')}
                      className="px-4 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container font-bold text-on-surface transition-colors"
                    >
                      Issue Formal Warning SMS
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Complaint Filing History */}
            <div className="space-y-2">
              <span className="font-bold text-on-surface block">
                User's Filing History ({userDetails?.complaints?.length || 0} Tickets)
              </span>

              {loadingDetails ? (
                <p className="text-on-surface-variant">Loading user complaints...</p>
              ) : (userDetails?.complaints?.length || 0) === 0 ? (
                <p className="text-on-surface-variant">No complaints recorded by this user.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-surface-container rounded-xl divide-y divide-surface-container">
                  {userDetails?.complaints?.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-2.5 flex items-center justify-between hover:bg-surface-container-low text-[11px]"
                    >
                      <div>
                        <span className="font-mono font-bold text-primary mr-2">
                          {c.complaintId}
                        </span>
                        <span className="font-medium text-on-surface">{c.category}</span>
                        <p className="text-on-surface-variant truncate max-w-[280px]">
                          {c.location}
                        </p>
                      </div>
                      <span className="font-bold text-on-surface">{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
