import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FraudScoreBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const AdminFraud: React.FC = () => {
  const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);
  const [phoneClustersCount, setPhoneClustersCount] = useState<number>(0);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchAccountFraudData();
  }, []);

  const fetchAccountFraudData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/suspicious');
      if (res.data?.success) {
        const users = res.data.users || [];
        setSuspiciousUsers(users);
        setPhoneClustersCount(res.data.phoneClustersCount || 0);
        if (users.length > 0) {
          setSelectedUser(users[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load account fraud data.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAccountRisk = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.put(`/users/${selectedUser.id}/fraud-score`, {
        fraudScore: 0,
        reason: 'Account cleared by Controller Super Admin after security audit.',
      });
      toast.success(`Account ${selectedUser.username} risk cleared!`);
      fetchAccountFraudData();
    } catch (err: any) {
      toast.error('Failed to clear risk score.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspend = async (isBanned: boolean) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await api.put(`/users/${selectedUser.id}/ban`, {
        isBanned,
        days: isBanned ? 14 : undefined,
        reason: isBanned ? 'Suspended for repeated identity and security policy alerts.' : 'Suspension lifted.',
      });
      toast.success(isBanned ? 'Account suspended for 14 days.' : 'Suspension lifted.');
      fetchAccountFraudData();
    } catch (err: any) {
      toast.error('Failed to update suspension status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Account Security & Fraud Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Account-Level Signals Only
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Monitors account security risks, duplicate phone clusters, suspicious login bursts, and authentication anomalies.
          </p>
        </div>

        <button
          onClick={fetchAccountFraudData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <span className={`material-symbols-outlined text-[16px] text-primary ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Strict Separation Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
        <span className="material-symbols-outlined text-[20px] text-blue-600 shrink-0 mt-0.5">
          verified_user
        </span>
        <div>
          <p className="font-bold">Architectural Boundary Guarantee</p>
          <p className="text-blue-800 mt-0.5 leading-relaxed">
            This Controller desk evaluates <strong>account-level security signals only</strong> (shared phone clustering, rapid identity creation, risk scores). <strong>Report verification (Genuine vs Fake)</strong> is strictly executed by field officers in the Officer Portal and does not alter account existence.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Flagged Accounts
          </span>
          <p className="text-2xl font-black text-on-surface mt-1">{suspiciousUsers.length}</p>
          <p className="text-[11px] text-on-surface-variant">Accounts with risk score &gt; 40</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Phone Clusters
          </span>
          <p className="text-2xl font-black text-amber-900 mt-1">{phoneClustersCount}</p>
          <p className="text-[11px] text-amber-700">Accounts sharing phone numbers</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">
            Suspended Accounts
          </span>
          <p className="text-2xl font-black text-red-900 mt-1">
            {suspiciousUsers.filter((u) => u.isBanned).length}
          </p>
          <p className="text-[11px] text-red-700">Restricted for security review</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Active Accounts
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {suspiciousUsers.filter((u) => !u.isBanned).length}
          </p>
          <p className="text-[11px] text-emerald-700">Permanent MongoDB storage</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
            progress_activity
          </span>
        </div>
      ) : suspiciousUsers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-surface-container text-center max-w-md mx-auto space-y-3 shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-emerald-600">
            shield_with_heart
          </span>
          <h3 className="font-bold text-base text-on-surface">Zero Security Risk Signals</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            All persistent user accounts in MongoDB are currently in good standing. No duplicate identity clusters or abnormal authentication bursts detected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Suspicious Accounts List */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-surface-container shadow-xs p-4 space-y-2 max-h-[680px] overflow-y-auto">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-2">
              Security Flagged Accounts ({suspiciousUsers.length})
            </h2>

            <div className="space-y-2 mt-2">
              {suspiciousUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-surface-container hover:border-outline-variant bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">{u.name || u.username}</span>
                        {u.accountNumber && (
                          <span className="px-1.5 py-0.2 rounded bg-surface-container text-primary font-mono text-[10px] font-bold">
                            {u.accountNumber}
                          </span>
                        )}
                      </div>
                      <FraudScoreBadge score={u.fraudScore || 0} />
                    </div>

                    <p className="text-on-surface-variant text-[11px] truncate font-mono">
                      {u.email} • {u.phone}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant pt-1 border-t border-surface-container/60">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      {u.isSharedPhoneRisk && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                          Shared Phone Risk
                        </span>
                      )}
                      <span>{u.accountStatus || 'ACTIVE'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Account Security Dossier */}
          {selectedUser && (
            <div className="lg:col-span-7 bg-white rounded-2xl border border-surface-container shadow-xs p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-on-surface">{selectedUser.name || selectedUser.username}</h2>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-xs font-bold">
                      {selectedUser.accountNumber || selectedUser.id}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                    Permanent MongoDB ID: {selectedUser.id}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <FraudScoreBadge score={selectedUser.fraudScore || 0} />
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedUser.isBanned ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedUser.isBanned ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Identity Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Email Identity</span>
                  <p className="font-semibold text-on-surface mt-0.5 truncate">{selectedUser.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Phone Identity</span>
                  <p className="font-semibold text-on-surface mt-0.5 font-mono">{selectedUser.phone}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Presence Status</span>
                  <p className="font-semibold text-on-surface mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedUser.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {selectedUser.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Registered Since</span>
                  <p className="font-semibold text-on-surface mt-0.5">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>

              {/* Risk Flags & Audit */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Account Risk Signals
                </h3>

                {selectedUser.isSharedPhoneRisk && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">
                      phonelink_lock
                    </span>
                    <div>
                      <p className="font-bold">Phone Number Clustering Detected</p>
                      <p className="text-[11px] mt-0.5">
                        Multiple account registrations have been initiated using this mobile number ({selectedUser.phone}).
                      </p>
                    </div>
                  </div>
                )}

                {selectedUser.fraudScore > 40 && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">
                      security
                    </span>
                    <div>
                      <p className="font-bold">Elevated Risk Score ({selectedUser.fraudScore} pts)</p>
                      <p className="text-[11px] mt-0.5">
                        Exceeds the normal risk threshold. Controller review recommended.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controller Administrative Actions */}
              <div className="border-t border-surface-container pt-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClearAccountRisk}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Clear Risk Score</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSuspend(!selectedUser.isBanned)}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs ${
                    selectedUser.isBanned
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {selectedUser.isBanned ? 'lock_open' : 'block'}
                  </span>
                  <span>{selectedUser.isBanned ? 'Lift Suspension' : 'Suspend Account (14 Days)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
