import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../ui/Navbar';
import { Sidebar } from '../ui/Sidebar';
import { BottomNav } from '../ui/BottomNav';
import { useStore } from '../../store/useStore';

export const AppLayout: React.FC = () => {
  const { user } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isCitizen = user?.role === 'CITIZEN';

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex w-full">
        {user && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <main className={`flex-1 min-w-0 overflow-y-auto ${isCitizen ? 'pb-20 md:pb-0' : ''}`}>
          <Outlet />
        </main>
      </div>
      {/* Mobile Android-style Bottom Navigation for Citizens */}
      {isCitizen && <BottomNav />}
    </div>
  );
};
