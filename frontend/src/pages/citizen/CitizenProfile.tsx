import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { TN_DISTRICTS, formatDate } from '../../lib/utils';
import { StatusBadge, CategoryBadge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export const CitizenProfile: React.FC = () => {
  const { user, updateUser, language, toggleLanguage } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable form fields
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || 'Tirunelveli');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);

  // Notification toggles
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (user?.id) {
      api.get(`/complaints/user/${user.id}`).then((res) => {
        if (res.data?.success) {
          setComplaints(res.data.complaints || []);
        }
        setLoading(false);
      });
    }
  }, [user?.id]);

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;
  const pending = complaints.filter(
    (c) => c.status !== 'RESOLVED' && c.status !== 'REJECTED'
  ).length;
  const rejected = complaints.filter((c) => c.status === 'REJECTED').length;

  // Civic Hero gamification badge calculation
  let heroTier = {
    title: 'Bronze Civic Hero',
    badge: '🥉 Bronze',
    color: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'Active neighborhood contributor (1-5 verified reports).',
  };

  if (total >= 15 || resolved >= 10) {
    heroTier = {
      title: 'Gold Civic Hero',
      badge: '🥇 Gold',
      color: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      description: 'Outstanding community champion (15+ verified reports).',
    };
  } else if (total >= 5 || resolved >= 3) {
    heroTier = {
      title: 'Silver Civic Hero',
      badge: '🥈 Silver',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      description: 'Reliable civic guardian (5-14 verified reports).',
    };
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/me', {
        phone,
        location,
        avatarUrl,
      });
      if (res.data?.success && res.data?.user) {
        updateUser(res.data.user);
        toast.success('Profile settings updated successfully.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Hero Badge */}
      <div className="bg-white rounded-3xl border border-surface-container p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={
              avatarUrl ||
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
            }
            alt={user?.username}
            className="w-20 h-20 rounded-full object-cover border-4 border-primary-light shadow-md"
          />
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold text-on-surface">{user?.username}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${heroTier.color}`}>
                {heroTier.badge}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 justify-center sm:justify-start">
              <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
              <span>{user?.location || 'Tamil Nadu'}</span> • <span>{user?.email}</span>
            </p>
            <p className="text-[11px] text-outline font-medium">
              Registered Citizen ID: {user?.id}
            </p>
          </div>
        </div>

        {/* Hero Level Card */}
        <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container text-center sm:text-right max-w-xs">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">
            {heroTier.title}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">{heroTier.description}</p>
          <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Fraud Score: {user?.fraudScore || 0}/100 (Safe)
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs text-center">
          <p className="text-3xl font-extrabold text-on-surface">{total}</p>
          <p className="text-xs font-semibold text-on-surface-variant mt-1">Total Reported</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs text-center">
          <p className="text-3xl font-extrabold text-emerald-600">{resolved}</p>
          <p className="text-xs font-semibold text-on-surface-variant mt-1">Resolved Issues</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs text-center">
          <p className="text-3xl font-extrabold text-amber-600">{pending}</p>
          <p className="text-xs font-semibold text-on-surface-variant mt-1">Under Resolution</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-2xs text-center">
          <p className="text-3xl font-extrabold text-gray-500">{rejected}</p>
          <p className="text-xs font-semibold text-on-surface-variant mt-1">Rejected</p>
        </div>
      </div>

      {/* Profile Form & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Edit Info Form */}
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">edit</span>
            Account Information
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Contact Phone (+91 Indian format)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Home District</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant text-xs outline-none bg-white focus:border-primary"
              >
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Saving changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Preferences & Notifications */}
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">tune</span>
            Preferences & Language
          </h2>

          <div className="space-y-4 text-xs">
            {/* Bilingual Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container">
              <div>
                <p className="font-bold text-on-surface">Language Preference</p>
                <p className="text-on-surface-variant">Active: {language === 'en' ? 'English' : 'தமிழ்'}</p>
              </div>
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-lg bg-white border border-outline-variant text-primary font-bold shadow-2xs hover:bg-surface-container transition-all"
              >
                Switch to {language === 'en' ? 'தமிழ்' : 'English'}
              </button>
            </div>

            {/* SMS Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container">
              <div>
                <p className="font-bold text-on-surface">SMS Status Updates</p>
                <p className="text-on-surface-variant">Receive instant SMS on ticket state changes</p>
              </div>
              <button
                onClick={() => setSmsNotifications(!smsNotifications)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  smsNotifications ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    smsNotifications ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Email Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container">
              <div>
                <p className="font-bold text-on-surface">Email Notifications</p>
                <p className="text-on-surface-variant">Resolution certificates and progress reports</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  emailNotifications ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    emailNotifications ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Complaint History Table */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <h2 className="text-base font-bold text-on-surface">Complaint Filing History</h2>
        {complaints.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No complaints recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-low text-on-surface-variant">
                  <th className="p-3 font-bold">Complaint ID</th>
                  <th className="p-3 font-bold">Category</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{c.complaintId}</td>
                    <td className="p-3">
                      <CategoryBadge category={c.category} />
                    </td>
                    <td className="p-3 text-on-surface truncate max-w-[200px]">{c.location}</td>
                    <td className="p-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3 text-on-surface-variant">{formatDate(c.createdAt)}</td>
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
