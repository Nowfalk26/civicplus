import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { CATEGORY_INFO, TN_DISTRICTS } from '../lib/utils';
import { api } from '../lib/api';

export const Landing: React.FC = () => {
  const { language, user } = useStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalComplaints: 0,
    resolvedComplaints: 0,
    resolvedRate: 0,
    fraudRate: 0,
    totalUsers: 0,
  });

  const handleAddReport = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      navigate('/add-report');
    } else {
      navigate('/civic/login', { state: { from: { pathname: '/add-report' } } });
    }
  };

  const handleViewCivicMap = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      navigate('/civic-map');
    } else {
      navigate('/civic/login', { state: { from: { pathname: '/civic-map' } } });
    }
  };

  useEffect(() => {
    api
      .get('/analytics/stats')
      .then((res) => {
        if (res.data?.stats) {
          setStats(res.data.stats);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-surface-container-high bg-radial from-surface-container-low via-surface to-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Government Seal & Official Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-light border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider shadow-2xs">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Tamil Nadu Municipal Civic Governance • தமிழ்நாடு நகராட்சி ஆளுகை</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tight leading-tight">
              {language === 'en' ? (
                <>
                  Report Civic Issues in <span className="text-primary">Tamil Nadu</span>.
                  <br />
                  <span className="text-primary-container">Track Fast Resolution.</span>
                </>
              ) : (
                <>
                  உங்கள் பகுதியில் உள்ள <span className="text-primary">குடிமைப் பிரச்சனைகளை</span> பதிவு செய்யுங்கள்.
                  <br />
                  <span className="text-primary-container">விரைவான தீர்வு காணுங்கள்.</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl text-on-surface-variant font-normal leading-relaxed">
              {language === 'en'
                ? 'From road damage and street lights to water drainage and electrical hazards—report with photo evidence, pinpoint GPS location, and track verified progress in real time.'
                : 'சாலை சேதம், தெரு விளக்கு, வடிகால் மற்றும் மின்கம்பி சிக்கல்களை புகைப்பட ஆதாரத்துடன் எளிதாக பதிவு செய்யுங்கள். நேரடி வரைபடத்தில் அதிகாரிகளின் தீர்வை கண்காணியுங்கள்.'}
            </p>

            {/* Action Buttons with Authentication Guard */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to={user ? '/add-report' : '/civic/login'}
                state={!user ? { from: { pathname: '/add-report' } } : undefined}
                onClick={handleAddReport}
                className="min-h-[54px] px-8 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-base shadow-lg shadow-primary/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[22px]">add_circle</span>
                <span>{language === 'en' ? 'Add Report' : 'புகார் சேர்க்கவும் (Add Report)'}</span>
              </Link>

              <Link
                to={user ? '/civic-map' : '/civic/login'}
                state={!user ? { from: { pathname: '/civic-map' } } : undefined}
                onClick={handleViewCivicMap}
                className="min-h-[54px] px-8 rounded-xl bg-white hover:bg-surface-container-low text-on-surface border-2 border-outline-variant font-bold text-base shadow-xs flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[22px] text-primary">map</span>
                <span>{language === 'en' ? 'View Civic Map' : 'வரைபடத்தை காண்க (View Civic Map)'}</span>
              </Link>
            </div>
          </div>

          {/* Live Impact Counters */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-sm text-center">
              <p className="text-3xl font-extrabold text-primary">{stats.totalComplaints > 0 ? `${stats.totalComplaints}+` : 0}</p>
              <p className="text-xs font-semibold text-on-surface-variant mt-1">
                {language === 'en' ? 'Total Complaints Logged' : 'பதிவான மொத்த புகார்கள்'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-sm text-center">
              <p className="text-3xl font-extrabold text-emerald-600">
                {stats.resolvedComplaints > 0 ? `${stats.resolvedComplaints}+` : 0}
              </p>
              <p className="text-xs font-semibold text-on-surface-variant mt-1">
                {language === 'en' ? 'Verified Issues Resolved' : 'சரிபார்க்கப்பட்ட தீர்வுகள்'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-sm text-center">
              <p className="text-3xl font-extrabold text-amber-600">38</p>
              <p className="text-xs font-semibold text-on-surface-variant mt-1">
                {language === 'en' ? 'Districts Covered' : 'உள்ளடக்கிய மாவட்டங்கள்'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-sm text-center">
              <p className="text-3xl font-extrabold text-purple-600">
                {stats.totalUsers > 0 ? `${stats.totalUsers}+` : 0}
              </p>
              <p className="text-xs font-semibold text-on-surface-variant mt-1">
                {language === 'en' ? 'Active Civic Heroes' : 'குடிமக்கள் & அதிகாரிகள்'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Portals Architecture Showcase */}
      <section className="py-16 bg-white border-b border-surface-container-high">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-on-surface">
              {language === 'en'
                ? 'Integrated 3-Portal Ecosystem'
                : '3 ஒருங்கிணைந்த ஆளுகை தளங்கள்'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-2">
              {language === 'en'
                ? 'Purpose-built dedicated interfaces for citizens, field officers, and administrative command.'
                : 'குடிமக்கள், கள அதிகாரிகள் மற்றும் தலைமை நிர்வாகத்திற்கான பிரத்யேக போர்டல்கள்.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Citizen Portal */}
            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">person</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Citizen Portal</h3>
                <p className="text-xs font-semibold text-emerald-700">குடிமக்கள் தளம்</p>
                <ul className="text-xs text-on-surface-variant space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    Interactive Live Leaflet map with colored issue pins
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    5-step quick complaint wizard with camera uploads
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    Vertical lifecycle timeline & WhatsApp status alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    "Civic Hero" Bronze/Silver/Gold gamification badges
                  </li>
                </ul>
              </div>

              <Link
                to={user ? '/civic-map' : '/civic/login'}
                state={!user ? { from: { pathname: '/civic-map' } } : undefined}
                className="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center flex items-center justify-center gap-1 shadow-sm"
              >
                <span>{user ? 'Enter Citizen Portal' : 'Civic Resident Login'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {/* Officer Portal */}
            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">engineering</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Officer Portal</h3>
                <p className="text-xs font-semibold text-primary">அதிகாரி தளம்</p>
                <ul className="text-xs text-on-surface-variant space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                    Department triage inbox (PWD, TANGEDCO, TWAD)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                    Interactive Before/After photo comparison slider
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                    Work order assignment & field crew mobilization
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                    Resolution verification & performance leaderboard
                  </li>
                </ul>
              </div>

              <Link
                to={user ? '/officer/dashboard' : '/officer/login'}
                className="mt-6 w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs text-center flex items-center justify-center gap-1 shadow-sm"
              >
                <span>{user ? 'Enter Officer Portal' : 'Official Officer Login'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {/* Admin Portal */}
            <div className="rounded-2xl border-2 border-purple-100 bg-purple-50/40 p-6 flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Control Portal</h3>
                <p className="text-xs font-semibold text-purple-700">தலைமை நிர்வாக பலகை</p>
                <ul className="text-xs text-on-surface-variant space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">check_circle</span>
                    Automated Fraud Detection AI & duplicate image audit
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">check_circle</span>
                    GPS mismatch inspection & phone frequency analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">check_circle</span>
                    User account suspension (7-day ban / permanent ban)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">check_circle</span>
                    District-wide analytics & policy threshold controls
                  </li>
                </ul>
              </div>

              <Link
                to={user ? '/admin/dashboard' : '/controller/login'}
                className="mt-6 w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs text-center flex items-center justify-center gap-1 shadow-sm"
              >
                <span>{user ? 'Enter Control Portal' : 'Controller Login'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">
              {language === 'en' ? 'Core Civic Categories' : 'முக்கிய புகார் பிரிவுகள்'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1.5">
              {language === 'en'
                ? 'Select any issue category to initiate resolution with responsible municipal departments.'
                : 'உடனடி தீர்வுக்கு பொருத்தமான பிரிவைத் தேர்ந்தெடுத்து புகாரளிக்கவும்.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
              <div
                key={key}
                className="bg-white p-5 rounded-2xl border border-surface-container hover:border-primary shadow-2xs hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110"
                  style={{ backgroundColor: cat.color }}
                >
                  <span className="material-symbols-outlined text-[24px]">{cat.icon}</span>
                </div>
                <h3 className="font-bold text-xs text-on-surface mt-1">{cat.labelEn}</h3>
                <p className="text-[11px] text-on-surface-variant">{cat.labelTa}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-surface-container-high py-8 text-center text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-on-surface">
            Civics Plus (குடிமக்கள் பிளஸ்) • Government of Tamil Nadu Civic Complaint Platform
          </p>
          <p>
            Developed with React.js, TypeScript, PostgreSQL (Supabase), Leaflet.js, and AI Fraud Detection Engine.
          </p>
          <p className="text-[11px] text-outline">
            Tirunelveli • Chennai • Coimbatore • Madurai • Salem • Tiruchirappalli & 32 other districts
          </p>
        </div>
      </footer>
    </div>
  );
};
