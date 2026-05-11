import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Layers, Award, Store, BarChart2,
  CheckSquare, AlertTriangle, GitBranch, Share2
} from 'lucide-react';
import clsx from 'clsx';

export const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const tabs = role === 'organization'
    ? [
        { path: '/org/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/org/batch-status', label: 'Batches', icon: Layers },
        { path: '/credential/template', label: 'Credentials', icon: Award },
        { path: '/marketplace', label: 'Market', icon: Store },
        { path: '/qr/reports', label: 'Reports', icon: BarChart2 },
      ]
    : role === 'super-admin'
    ? [
        { path: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/admin/org-approvals', label: 'Approvals', icon: CheckSquare },
        { path: '/admin/batch-monitor', label: 'Batches', icon: Layers },
        { path: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
        { path: '/marketplace', label: 'Market', icon: Store },
      ]
    : role === 'individual'
    ? [
        { path: '/individual/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/individual/skill-tree', label: 'Skills', icon: GitBranch },
        { path: '/individual/credentials', label: 'Creds', icon: Award },
        { path: '/individual/share', label: 'Share', icon: Share2 },
        { path: '/marketplace', label: 'Market', icon: Store },
      ]
    : [
        { path: '/marketplace', label: 'Market', icon: Store },
        { path: '/qr/reports', label: 'Reports', icon: BarChart2 },
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                isActive ? 'text-brand-blue' : 'text-gray-400'
              )}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium font-inter">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
