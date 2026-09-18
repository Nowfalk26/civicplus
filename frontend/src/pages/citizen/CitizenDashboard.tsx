import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LeafletMap } from '../../components/LeafletMap';
import { ComplaintCard } from '../../components/ComplaintCard';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { DISTRICT_COORDS } from '../../lib/utils';

export const CitizenDashboard: React.FC = () => {
  const { user, language } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints?limit=100');
      if (res.data?.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine user's district coordinate center
  const userDistrict = user?.location || 'Tirunelveli';
  const defaultCenterInfo = (DISTRICT_COORDS as any)[userDistrict] || {
    lat: 8.7139,
    lng: 77.7567,
  };
  const mapCenter: [number, number] = [defaultCenterInfo.lat, defaultCenterInfo.lng];

  // Apply filters
  const filteredComplaints = complaints.filter((c) => {
    if (filter === 'MINE' && c.reportedById !== user?.id) return false;
    if (filter === 'UNRESOLVED' && c.status === 'RESOLVED') return false;
    if (filter === 'RESOLVED' && c.status !== 'RESOLVED') return false;
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
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
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-surface">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-surface-container-high px-4 py-2.5 z-20 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'All Issues' : 'அனைத்தும்'} ({complaints.length})
          </button>

          <button
            onClick={() => setFilter('MINE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'MINE'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'My Reports' : 'எனது புகார்கள்'} (
            {complaints.filter((c) => c.reportedById === user?.id).length})
          </button>

          <button
            onClick={() => setFilter('UNRESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'UNRESOLVED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'Unresolved' : 'தீர்க்கப்படாதவை'} (
            {complaints.filter((c) => c.status !== 'RESOLVED').length})
          </button>

          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'Resolved' : 'தீர்க்கப்பட்டவை'} (
            {complaints.filter((c) => c.status === 'RESOLVED').length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'en' ? 'Search ID, street, ward...' : 'தேடுக...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs outline-none focus:border-primary"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-outline-variant bg-white text-on-surface outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="ROAD_DAMAGE">Road Damage</option>
            <option value="STREET_LIGHT">Street Light</option>
            <option value="ELECTRICAL_WIRE">Electrical Wire</option>
            <option value="GARBAGE_WASTE">Garbage Waste</option>
            <option value="STORM_WATER_DRAIN">Storm Water Drain</option>
            <option value="PUBLIC_SPACE">Public Space</option>
          </select>
        </div>
      </div>

      {/* Main Map Canvas & Overlay Drawer */}
      <div className="relative flex-1 w-full h-full">
        {/* Full-screen Leaflet Map */}
        <LeafletMap
          complaints={filteredComplaints}
          center={mapCenter}
          zoom={12}
          height="100%"
          className="rounded-none border-0"
        />

        {/* Map Legend Floating Pill */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-surface-container text-[11px] font-semibold space-y-1 hidden md:block">
          <p className="font-bold text-xs text-on-surface border-b border-surface-container pb-1">
            Map Legend • வரைபட விளக்கம்
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Submitted (சமர்ப்பிக்கப்பட்டது)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Assigned / In Progress (செயலில்)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Resolved (தீர்க்கப்பட்டது)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span>Rejected (நிராகரிக்கப்பட்டது)</span>
          </div>
        </div>

        {/* Floating Action Button (FAB) "+" to Report Issue */}
        <Link
          to="/citizen/report"
          className="absolute bottom-6 right-6 z-20 px-5 py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-xl shadow-primary/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:rotate-90 transition-transform">
            add
          </span>
          <span className="hidden sm:inline">
            {language === 'en' ? 'Report New Problem' : 'புதிய புகார் அளி'}
          </span>
        </Link>
      </div>
    </div>
  );
};
