import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ComplaintCard } from '../../components/ComplaintCard';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

export const MyComplaints: React.FC = () => {
  const { user, language } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchMyComplaints();
    }
  }, [user?.id]);

  const fetchMyComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/complaints/user/${user?.id}`);
      if (res.data?.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error('Error fetching user complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'ALL', labelEn: 'All Reports', labelTa: 'அனைத்தும்' },
    { key: 'SUBMITTED', labelEn: 'In Review', labelTa: 'பரிசீலனையில்' },
    { key: 'IN_PROGRESS', labelEn: 'In Progress', labelTa: 'செயலில்' },
    { key: 'RESOLVED', labelEn: 'Resolved', labelTa: 'தீர்க்கப்பட்டது' },
    { key: 'REJECTED', labelEn: 'Rejected', labelTa: 'நிராகரிக்கப்பட்டது' },
  ];

  const filtered = complaints.filter((c) => {
    if (activeTab !== 'ALL') {
      if (activeTab === 'IN_PROGRESS') {
        if (c.status !== 'IN_PROGRESS' && c.status !== 'ASSIGNED' && c.status !== 'ACCEPTED')
          return false;
      } else if (c.status !== activeTab) {
        return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        c.complaintId.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & New Report CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {language === 'en' ? 'My Reported Complaints' : 'எனது புகார்கள்'}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {language === 'en'
              ? 'Track real-time progress and departmental actions on issues you reported'
              : 'நீங்கள் சமர்ப்பித்த புகார்களின் தற்போதைய நிலையை கண்காணிக்கவும்'}
          </p>
        </div>

        <Link
          to="/citizen/report"
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>{language === 'en' ? 'Report New Issue' : 'புதிய புகார்'}</span>
        </Link>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white p-3 rounded-2xl border border-surface-container shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {language === 'en' ? tab.labelEn : tab.labelTa}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search complaint ID or street..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Complaint Cards Grid */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
            progress_activity
          </span>
          <p className="text-xs text-on-surface-variant">Loading your civic records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-container p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[32px]">folder_open</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-on-surface">No complaints found</h3>
            <p className="text-xs text-on-surface-variant">
              {complaints.length === 0
                ? "You haven't reported any civic issues yet. Be a civic hero for your neighborhood!"
                : 'No complaints match the current filter or search criteria.'}
            </p>
          </div>
          {complaints.length === 0 && (
            <Link
              to="/citizen/report"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:bg-primary-dark transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Report an Issue Now
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cmp) => (
            <ComplaintCard
              key={cmp.id}
              complaint={cmp}
              linkPrefix="/citizen/complaints"
            />
          ))}
        </div>
      )}
    </div>
  );
};
