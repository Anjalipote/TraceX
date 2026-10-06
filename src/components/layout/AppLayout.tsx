import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '../common/Toast';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070A0F] text-[#F8FAFC] flex">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Topbar />

        <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
