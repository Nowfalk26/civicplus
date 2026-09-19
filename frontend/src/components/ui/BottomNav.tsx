import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export const BottomNav: React.FC = () => {
  const { language, user } = useStore();
  const location = useLocation();

  // Only citizens see this mobile bottom navigation
  if (user?.role !== 'CITIZEN') {
    return null;
  }

  const navItems = [
    {
      to: '/citizen/dashboard',
      icon: 'map',
      labelEn: 'Civic Map',
      labelTa: 'வரைபடம்',
      matchRoutes: ['/citizen/dashboard', '/civic-map'],
    },
    {
      to: '/citizen/directions',
      icon: 'alt_route',
      labelEn: 'Route',
      labelTa: 'வழித்தடம்',
      matchRoutes: ['/citizen/directions', '/citizen/route-reports'],
    },
    {
      to: '/add-report',
      icon: 'add_location_alt',
      labelEn: 'Report',
      labelTa: 'புகார் செய்',
      isPrimary: true,
      matchRoutes: ['/add-report', '/citizen/report'],
    },
    {
      to: '/citizen/my-complaints',
      icon: 'task_alt',
      labelEn: 'My Reports',
      labelTa: 'என் புகார்கள்',
      matchRoutes: ['/citizen/my-complaints'],
    },
    {
      to: '/citizen/profile',
      icon: 'account_circle',
      labelEn: 'Profile',
      labelTa: 'சுயவிவரம்',
      matchRoutes: ['/citizen/profile'],
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-surface-container-high shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1 flex items-center justify-around"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}
    >
      {navItems.map((item) => {
        const isActive = item.matchRoutes.some((route) =>
          location.pathname === route || location.pathname.startsWith(`${route}/`)
        );

        if (item.isPrimary) {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative -top-3 flex flex-col items-center justify-center group"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-primary text-white hover:bg-primary-dark shadow-primary/30'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              <span
                className={`text-[10px] font-bold mt-0.5 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {language === 'en' ? item.labelEn : item.labelTa}
              </span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-colors active:bg-surface-container-low ${
              isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'bg-blue-100 text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <span
              className={`text-[10px] tracking-tight truncate max-w-[64px] ${
                isActive ? 'font-bold text-primary' : 'font-medium text-on-surface-variant'
              }`}
            >
              {language === 'en' ? item.labelEn : item.labelTa}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
};
