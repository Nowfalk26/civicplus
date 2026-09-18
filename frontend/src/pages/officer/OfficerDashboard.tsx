import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const OfficerDashboard: React.FC = () => {
  const { user, language } = useStore();
  const [stats, setStats] = useState<any | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, complaintsRes] = await Promise.all([
        api.get('/analytics/stats'),
        api.get('/complaints?limit=6'),
      ]);

      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
      if (complaintsRes.data?.complaints) {
        setRecentComplaints(complaintsRes.data.complaints);
      }
    } catch (err) {
      console.error('Error fetching officer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const trendData = stats?.trend7Days || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-3xl border border-surface-container p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30">
            <span className="material-symbols-outlined text-[36px]">badge</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-on-surface">
                Welcome, {user?.username}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Official Duty
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Field Operations & Municipal Dispatch • {user?.location || 'Tamil Nadu'} Circle
            </p>
          </div>
        </div>

        {/* Quick Action Links */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/officer/inbox"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">inbox</span>
            <span>Open Triage Inbox</span>
          </Link>

          <Link
            to="/officer/verify"
            className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs border border-surface-container flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">fact_check</span>
            <span>Verify Work</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              New Unassigned
            </span>
            <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface mt-2">
            {stats?.statusCounts?.SUBMITTED ?? 0}
          </p>
          <p className="text-[11px] text-red-600 font-semibold mt-1">Requires immediate triage</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Field Assigned
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">engineering</span>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-primary mt-2">
            {(stats?.statusCounts?.ASSIGNED || 0) + (stats?.statusCounts?.ACCEPTED || 0)}
          </p>
          <p className="text-[11px] text-on-surface-variant font-medium mt-1">Active work orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Work In Progress
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">construction</span>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">
            {stats?.statusCounts?.IN_PROGRESS ?? 0}
          </p>
          <p className="text-[11px] text-on-surface-variant font-medium mt-1">Repairs underway</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Resolved Today
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {stats?.resolvedComplaints ?? 0}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {stats?.resolvedRate ?? 0}% resolution rate
          </p>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              7-Day Operational Trend: Complaints Received vs Resolved
            </h2>
            <p className="text-xs text-on-surface-variant">
              Daily incoming volume vs verified departmental closure
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff4ff" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#737686' }} />
              <YAxis tick={{ fontSize: 12, fill: '#737686' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #dce9ff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="received"
                name="Received"
                stroke="#004ac6"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent High Priority Queue */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">
            Immediate Dispatch Queue (Recent Complaints)
          </h2>
          <Link
            to="/officer/inbox"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Tickets</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {recentComplaints.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant space-y-1 border border-surface-container rounded-xl">
            <span className="material-symbols-outlined text-outline text-[32px]">inbox</span>
            <p className="font-bold text-on-surface">Dispatch Queue Empty</p>
            <p>No active complaints currently registered in this circle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-low text-on-surface-variant">
                  <th className="p-3 font-bold">Complaint ID</th>
                  <th className="p-3 font-bold">Category</th>
                  <th className="p-3 font-bold">Priority</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">Submitted At</th>
                  <th className="p-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {recentComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{c.complaintId}</td>
                    <td className="p-3">
                      <CategoryBadge category={c.category} />
                    </td>
                    <td className="p-3">
                      <PriorityBadge priority={c.priority || 'MEDIUM'} />
                    </td>
                    <td className="p-3 text-on-surface truncate max-w-[200px]">{c.location}</td>
                    <td className="p-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3 text-on-surface-variant">{formatDate(c.createdAt)}</td>
                    <td className="p-3 text-right">
                      <Link
                        to="/officer/inbox"
                        className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-white font-bold text-on-surface transition-colors"
                      >
                        Triage
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
