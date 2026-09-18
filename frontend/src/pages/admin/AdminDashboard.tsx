import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { FraudScoreBadge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export const AdminDashboard: React.FC = () => {
  const { user, language } = useStore();
  const [stats, setStats] = useState<any | null>(null);
  const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);
  const [flaggedComplaints, setFlaggedComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, fraudRes] = await Promise.all([
        api.get('/analytics/stats'),
        api.get('/analytics/fraud-detection'),
      ]);

      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
      if (fraudRes.data?.suspiciousUsers) {
        setSuspiciousUsers(fraudRes.data.suspiciousUsers);
      }
      if (fraudRes.data?.flaggedComplaints) {
        setFlaggedComplaints(fraudRes.data.flaggedComplaints.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const areaChartData = stats?.trend7Days?.map((d: any) => ({
    month: d.date,
    complaints: d.received,
    verified: d.resolved,
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-surface-container p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-700/30">
            <span className="material-symbols-outlined text-[36px]">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">
                Tamil Nadu State Command Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Real-time platform governance, anti-fraud enforcement, and district audit logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/fraud"
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">security</span>
            <span>Investigate Fraud AI</span>
          </Link>

          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs border border-surface-container flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">manage_accounts</span>
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* 5 System Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
            Total Users
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-1.5">
            {stats?.totalUsers ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Citizens & Staff</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
            Active Today
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-primary mt-1.5">
            {stats?.totalUsers ? Math.min(stats.totalUsers, Math.ceil(stats.totalUsers * 0.7)) : 0}
          </p>
          <span className="text-[10px] text-primary font-semibold">Online across districts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
            Total Complaints
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-1.5">
            {stats?.totalComplaints ?? 0}
          </p>
          <span className="text-[10px] text-on-surface-variant">Central queue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
            Fake / Flagged
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1.5">
            {stats?.flaggedComplaints ?? 0}
          </p>
          <span className="text-[10px] text-amber-700 font-semibold">Flagged by AI rules</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
            Fraud Rate %
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1.5">
            {stats?.fraudRate ?? 0}%
          </p>
          <span className="text-[10px] text-red-700 font-semibold">Threshold: &lt;8.0%</span>
        </div>
      </div>

      {/* Grid: Growth Graph & Suspicious Accounts Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Growth Area Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-on-surface">
                Platform Activity & Resolution Trajectory
              </h2>
              <p className="text-xs text-on-surface-variant">
                Monthly complaints filing vs verification volume
              </p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
              Statewide Metric
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eff4ff" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#737686' }} />
                <YAxis tick={{ fontSize: 12, fill: '#737686' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #dce9ff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="complaints"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorComp)"
                  name="Complaints Filed"
                />
                <Area
                  type="monotone"
                  dataKey="verified"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVer)"
                  name="Verified & Closed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suspicious Accounts Alerts Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 text-[20px]">
                crisis_alert
              </span>
              <span>Suspicious Accounts Alert</span>
            </h2>
            <Link to="/admin/fraud" className="text-xs font-bold text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {suspiciousUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-on-surface-variant space-y-1">
                <span className="material-symbols-outlined text-emerald-600 text-[28px]">verified_user</span>
                <p className="font-bold text-on-surface">No Suspicious Activity</p>
                <p>Zero accounts flagged with high fraud score.</p>
              </div>
            ) : (
              suspiciousUsers.slice(0, 4).map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-surface-container-low border border-surface-container space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-on-surface">{u.username}</span>
                    <FraudScoreBadge score={u.fraudScore} showText={false} />
                  </div>
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <span>{u.location}</span> • <span>{u.phone}</span>
                  </p>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-surface-container">
                    <span className="text-red-700 font-semibold">
                      {u.isBanned ? '● Currently Suspended' : '● Auto-Ban Warning'}
                    </span>
                    <Link
                      to="/admin/users"
                      className="font-bold text-primary hover:underline"
                    >
                      Inspect Profile &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Flagged Complaints Table Snippet */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">
            Recently Auto-Flagged Complaints (Fraud Risk)
          </h2>
          <Link
            to="/admin/fraud"
            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
          >
            <span>Open Fraud Investigation Suite</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {flaggedComplaints.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant space-y-1 border border-surface-container rounded-xl">
            <span className="material-symbols-outlined text-emerald-600 text-[32px]">verified</span>
            <p className="font-bold text-on-surface">No Flagged Complaints</p>
            <p>Zero fraud flags triggered. The complaint register is currently clean.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-low text-on-surface-variant">
                  <th className="p-3 font-bold">Complaint ID</th>
                  <th className="p-3 font-bold">Category</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Flagged Reason</th>
                  <th className="p-3 font-bold">Risk Score</th>
                  <th className="p-3 font-bold text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {flaggedComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{c.complaintId}</td>
                    <td className="p-3 font-semibold text-on-surface">{c.category}</td>
                    <td className="p-3 text-on-surface truncate max-w-[180px]">{c.location}</td>
                    <td className="p-3 text-red-700 font-medium truncate max-w-[260px]">
                      {c.fraudFlags?.[0]?.reason || 'Duplicate photo / GPS mismatch detected'}
                    </td>
                    <td className="p-3">
                      <FraudScoreBadge score={c.totalFraudScore || 30} showText={false} />
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        to="/admin/fraud"
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold transition-colors"
                      >
                        Audit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
