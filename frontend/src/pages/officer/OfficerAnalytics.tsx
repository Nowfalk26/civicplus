import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

export const OfficerAnalytics: React.FC = () => {
  const { language } = useStore();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/stats').then((res) => {
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
      setLoading(false);
    });
  }, []);

  const departmentPerformance = [
    { dept: 'PWD Highways', assigned: 64, resolved: 52, avgHours: 28, rate: '81.2%' },
    { dept: 'TANGEDCO Electricity', assigned: 58, resolved: 51, avgHours: 14, rate: '87.9%' },
    { dept: 'Corporation Sanitation', assigned: 82, resolved: 74, avgHours: 18, rate: '90.2%' },
    { dept: 'TWAD Water Supply', assigned: 45, resolved: 36, avgHours: 32, rate: '80.0%' },
    { dept: 'Drainage & Storm Water', assigned: 51, resolved: 39, avgHours: 36, rate: '76.4%' },
  ];

  const officerLeaderboard = [
    { rank: 1, name: 'Er. S. Murugesan', district: 'Tirunelveli', dept: 'PWD', resolved: 48, score: 98 },
    { rank: 2, name: 'Er. K. Anbarasan', district: 'Tirunelveli', dept: 'TANGEDCO', resolved: 45, score: 96 },
    { rank: 3, name: 'Er. M. Sivakumar', district: 'Chennai', dept: 'PWD', resolved: 43, score: 95 },
    { rank: 4, name: 'Dr. V. Karpagam', district: 'Tirunelveli', dept: 'Sanitation', resolved: 41, score: 93 },
    { rank: 5, name: 'Er. R. Senthil Kumar', district: 'Chennai', dept: 'TWAD', resolved: 39, score: 91 },
  ];

  const barChartData = [
    { category: 'Road Damage', total: 42, resolved: 32 },
    { category: 'Street Light', total: 38, resolved: 34 },
    { category: 'Electric Wire', total: 31, resolved: 28 },
    { category: 'Garbage', total: 46, resolved: 40 },
    { category: 'Drainage', total: 29, resolved: 21 },
    { category: 'Public Space', total: 14, resolved: 11 },
  ];

  const handleExport = (format: 'PDF' | 'Excel') => {
    toast.success(`Exporting Department Analytics Report as ${format}...`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Department Performance & Officer Analytics
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Key municipal operational indicators, resolution velocity, and officer rankings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('PDF')}
            className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-red-600">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => handleExport('Excel')}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Category Breakdown Bar Chart */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">
            Civic Issue Volume vs Resolved By Category
          </h2>
          <span className="text-xs font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-lg">
            Cumulative State Metrics
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff4ff" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#737686' }} />
              <YAxis tick={{ fontSize: 11, fill: '#737686' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #dce9ff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="total" name="Total Filed" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Performance Table */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <h2 className="text-base font-bold text-on-surface">Departmental Efficiency Index</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-low text-on-surface-variant">
                <th className="p-3 font-bold">Department Agency</th>
                <th className="p-3 font-bold">Assigned Tickets</th>
                <th className="p-3 font-bold">Resolved</th>
                <th className="p-3 font-bold">Avg Response (Hours)</th>
                <th className="p-3 font-bold text-right">Resolution Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {departmentPerformance.map((dept, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3 font-bold text-on-surface">{dept.dept}</td>
                  <td className="p-3 font-semibold text-primary">{dept.assigned}</td>
                  <td className="p-3 font-semibold text-emerald-600">{dept.resolved}</td>
                  <td className="p-3 text-on-surface-variant">{dept.avgHours} hrs</td>
                  <td className="p-3 font-extrabold text-emerald-700 text-right">{dept.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Officer Leaderboard */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-[22px]">trophy</span>
          Top Performing Municipal Officers (Leaderboard)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {officerLeaderboard.slice(0, 3).map((off) => (
            <div
              key={off.rank}
              className="bg-surface-container-low p-4 rounded-2xl border border-surface-container flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-sm shrink-0">
                #{off.rank}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-on-surface truncate">{off.name}</p>
                <p className="text-[11px] text-primary font-semibold">
                  {off.dept} • {off.district}
                </p>
                <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
                  <span>{off.resolved} Resolved</span>
                  <span className="font-bold text-emerald-700">{off.score}% Efficiency</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
