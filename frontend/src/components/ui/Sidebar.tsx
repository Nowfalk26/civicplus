import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, language, logout } = useStore();
  const navigate = useNavigate();

  if (!user) return null;

  const citizenLinks = [
    {
      to: '/citizen/dashboard',
      icon: 'map',
      labelEn: 'Civic Live Map',
      labelTa: 'நேரடி வரைபடம்',
    },
    {
      to: '/citizen/directions',
      icon: 'alt_route',
      labelEn: 'Directions & Reports',
      labelTa: 'வழித்தடம் & புகார்கள்',
    },
    {
      to: '/citizen/report',
      icon: 'add_circle',
      labelEn: 'Report Issue',
      labelTa: 'புகார் அளிக்கவும்',
      highlight: true,
    },
    {
      to: '/citizen/complaints',
      icon: 'format_list_bulleted',
      labelEn: 'My Complaints',
      labelTa: 'எனது புகார்கள்',
    },
    {
      to: '/citizen/profile',
      icon: 'shield_person',
      labelEn: 'Civic Hero Profile',
      labelTa: 'சுயவிவரம்',
    },
  ];

  const officerLinks = [
    {
      to: '/officer/dashboard',
      icon: 'dashboard',
      labelEn: 'Officer Dashboard',
      labelTa: 'கட்டுப்பாட்டு பலகை',
    },
    {
      to: '/officer/inbox',
      icon: 'inbox',
      labelEn: 'Complaint Inbox',
      labelTa: 'புகார் பெட்டி',
    },
    {
      to: '/officer/employees',
      icon: 'badge',
      labelEn: 'Employee Management',
      labelTa: 'ஊழியர் மேலாண்மை',
    },
    {
      to: '/officer/assignments',
      icon: 'assignment_ind',
      labelEn: 'Report Assignment Desk',
      labelTa: 'பணி ஒதுக்கீடு',
    },
    {
      to: '/officer/verify',
      icon: 'fact_check',
      labelEn: 'Report Verification Desk',
      labelTa: 'அறிக்கை சரிபார்ப்பு',
    },
    {
      to: '/officer/analytics',
      icon: 'analytics',
      labelEn: 'Department Analytics',
      labelTa: 'பகுப்பாய்வு',
    },
    {
      to: '/officer/profile',
      icon: 'shield_person',
      labelEn: 'Official Profile & Updates',
      labelTa: 'அதிகாரி விவரம்',
    },
  ];

  const employeeLinks = [
    {
      to: '/employee/dashboard',
      icon: 'engineering',
      labelEn: 'My Assigned Reports',
      labelTa: 'எனது பணிகள்',
    },
  ];

  const adminLinks = [
    {
      to: '/admin/dashboard',
      icon: 'admin_panel_settings',
      labelEn: 'Control Dashboard',
      labelTa: 'நிர்வாக பலகை',
    },
    {
      to: '/admin/officer-approvals',
      icon: 'how_to_reg',
      labelEn: 'Officer Access Approvals',
      labelTa: 'அதிகாரி அனுமதிகள்',
      badge: 'Queue',
    },
    {
      to: '/admin/profile-requests',
      icon: 'edit_document',
      labelEn: 'Profile Change Reviews',
      labelTa: 'விவர மாற்ற கோரிக்கைகள்',
    },
    {
      to: '/admin/users',
      icon: 'manage_accounts',
      labelEn: 'User Management & Presence',
      labelTa: 'பயனர் மேலாண்மை',
    },
    {
      to: '/admin/fraud',
      icon: 'security',
      labelEn: 'Account Fraud AI',
      labelTa: 'மோசடி கண்டறிதல்',
      badge: 'Risk',
    },
    {
      to: '/admin/settings',
      icon: 'tune',
      labelEn: 'System Settings',
      labelTa: 'அமைப்புகள்',
    },
  ];

  const links =
    user.role === 'ADMIN'
      ? adminLinks
      : user.role === 'OFFICER'
      ? officerLinks
      : user.role === 'EMPLOYEE'
      ? employeeLinks
      : citizenLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-surface-container-high transition-transform duration-200 flex flex-col justify-between shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Navigation Items */}
        <div className="p-4 space-y-1.5 overflow-y-auto">
          {/* User quick profile summary */}
          <div className="p-3 mb-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-3">
            <img
              src={
                user.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
              }
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user.username}</p>
              <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                <span className="truncate">{user.location}</span>
              </p>
            </div>
          </div>

          <div className="px-2 pb-1 text-[11px] font-bold text-outline tracking-wider uppercase">
            {user.role} WORKSPACE
          </div>

          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/25'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  (link as any).highlight &&
                    !location.pathname.includes(link.to) &&
                    'bg-primary-light text-primary hover:bg-primary/10'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'material-symbols-outlined text-[20px] transition-transform group-hover:scale-110',
                        isActive ? 'text-white' : 'text-primary'
                      )}
                    >
                      {link.icon}
                    </span>
                    <span className="truncate">
                      {language === 'en' ? link.labelEn : link.labelTa}
                    </span>
                  </div>

                  {(link as any).badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                      {(link as any).badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom actions: Tamil Nadu Helpline & Sign Out */}
        <div className="p-4 border-t border-surface-container-high space-y-2 bg-surface-container-lowest">
          <div className="p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container">
            <p className="font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-secondary">phone_in_talk</span>
              CM Helpline • 1100
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Tamil Nadu Citizen Care Toll-Free
            </p>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {language === 'en' ? 'Log Out' : 'வெளியேறு'}
          </button>
        </div>
      </aside>
    </>
  );
};
