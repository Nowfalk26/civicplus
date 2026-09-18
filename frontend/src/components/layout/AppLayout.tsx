import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../ui/Navbar';
import { Sidebar } from '../ui/Sidebar';
import { useStore } from '../../store/useStore';

export const AppLayout: React.FC = () => {
  const { user } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex w-full">
        {user && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
