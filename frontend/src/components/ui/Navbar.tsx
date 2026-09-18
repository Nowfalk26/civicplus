import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, language, toggleLanguage, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPortalBadge = () => {
    if (!user) return null;
    switch (user.role) {
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Control Portal • நிர்வாகி
          </span>
        );
      case 'OFFICER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Officer Portal • அதிகாரி
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Citizen Portal • குடிமக்கள்
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-surface-container-high shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {user && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:bg-primary-dark transition-colors">
              <span className="material-symbols-outlined text-[24px]">account_balance</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-on-surface tracking-tight leading-none">
                  Civics Plus
                </span>
                <span className="text-xs font-medium text-on-surface-variant leading-none hidden sm:inline">
                  குடிமக்கள் பிளஸ்
                </span>
              </div>
              <span className="text-[11px] font-semibold text-primary leading-none mt-1">
                Govt. of Tamil Nadu • தமிழ்நாடு அரசு
              </span>
            </div>
          </Link>

          <div className="hidden md:flex ml-2">{getPortalBadge()}</div>
        </div>

        {/* Right: Language switch & User menu */}
        <div className="flex items-center gap-2.5">
          {/* Bilingual Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary text-xs font-bold bg-surface-container-low hover:bg-surface-container transition-all flex items-center gap-1.5"
            title="Toggle Tamil / English"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">translate</span>
            <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={
                  user.role === 'ADMIN'
                    ? '/admin/dashboard'
                    : user.role === 'OFFICER'
                    ? '/officer/dashboard'
                    : '/citizen/profile'
                }
                className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-surface-container transition-colors"
              >
                <img
                  src={
                    user.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                  }
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover border border-primary/20"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface leading-tight">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">
                    {user.location}
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Log Out"
                aria-label="Log Out"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5">
                <Link
                  to="/civic/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  Civic Login
                </Link>
                <Link
                  to="/officer/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  Officer Login
                </Link>
                <Link
                  to="/controller/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                >
                  Controller
                </Link>
              </div>

              <Link
                to="/login"
                className="sm:hidden px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary-light transition-colors"
              >
                Portals
              </Link>

              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm"
              >
                {language === 'en' ? 'Register' : 'பதிவு'}
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
