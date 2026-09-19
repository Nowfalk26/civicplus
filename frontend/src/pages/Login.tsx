import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const Login: React.FC = () => {
  const { language } = useStore();
  const location = useLocation();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-surface-container shadow-2xl p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
            <span className="material-symbols-outlined text-[32px]">account_balance</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-light border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider">
            <span>Tamil Nadu Civic Complaints System</span>
          </div>
          <h1 className="text-3xl font-extrabold text-on-surface">
            {language === 'en' ? 'Select Your Portal' : 'உங்கள் நுழைவாயிலைத் தேர்ந்தெடுக்கவும்'}
          </h1>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            {language === 'en'
              ? 'Civics Plus maintains distinct, highly secure login gateways for Residents, Verified Civic Officers, and State Controllers.'
              : 'குடிமக்கள், கள அலுவலர்கள் மற்றும் மாநில தலைமை கட்டுப்பாட்டாளருக்கான பிரத்யேக நுழைவாயில்கள்.'}
          </p>
        </div>

        {/* 3 Distinct Portals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Civic Portal */}
          <Link
            to="/civic/login"
            state={location.state}
            className="group p-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">how_to_reg</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Civic Login</h3>
                <p className="text-[11px] font-semibold text-emerald-800">குடிமக்கள் தளம்</p>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Report civic issues, track real-time resolution, and vote on community priorities.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>Enter as Citizen</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>

          {/* 2. Officer Portal */}
          <Link
            to="/officer/login"
            state={location.state}
            className="group p-6 rounded-2xl border-2 border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-700/20 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">engineering</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Officer Login</h3>
                <p className="text-[11px] font-semibold text-blue-800">அதிகாரி தளம்</p>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Strict approval-based portal for PWD, TANGEDCO, and TWAD municipal staff.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs font-bold text-blue-800">
              <span>Enter as Officer</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>

          {/* 3. Controller Portal */}
          <Link
            to="/controller/login"
            state={location.state}
            className="group p-6 rounded-2xl border-2 border-purple-100 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-1"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-700/20 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px]">admin_panel_settings</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Controller Login</h3>
                <p className="text-[11px] font-semibold text-purple-800">தலைமை நிர்வாகி</p>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Dedicated state authority portal for officer approvals, fraud inspection & oversight.
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-purple-200/60 flex items-center justify-between text-xs font-bold text-purple-800">
              <span>Enter as Controller</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>
        </div>

        {/* Access Assistance Footer */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">help</span>
            <span className="text-on-surface-variant">
              Are you a municipal officer awaiting access approval?
            </span>
          </div>
          <Link
            to="/officer/request-access"
            className="font-bold text-primary hover:underline shrink-0"
          >
            Submit Access Request →
          </Link>
        </div>
      </div>
    </div>
  );
};

