import React, { useLayoutEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Layers, Award,
  CheckSquare, GitBranch, Share2
} from 'lucide-react';
import clsx from 'clsx';

// Each page renders its own nav, so the active bar starts from where it was on the previous page.
let lastActiveCenter = null;

export const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const tabs = role === 'organization'
    ? [
        { path: '/org/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/org/batch-status', label: 'Batches', icon: Layers },
        { path: '/qr/reports', label: 'Certs', icon: Award },
      ]
    : role === 'super-admin'
    ? [
        { path: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/admin/promote-super-admin', label: 'Admins', icon: CheckSquare },
        { path: '/admin/batch-monitor', label: 'Batches', icon: Layers },
      ]
    : role === 'individual'
    ? [
        { path: '/individual/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/individual/skill-tree', label: 'Skills', icon: GitBranch },
        { path: '/individual/credentials', label: 'Creds', icon: Award },
        { path: '/individual/share', label: 'Share', icon: Share2 },
      ]
    : [
        { path: '/qr/reports', label: 'Certs', icon: Award },
      ];

  const rowRef = useRef(null);
  const barRef = useRef(null);
  useLayoutEffect(() => {
    const active = rowRef.current?.querySelector('[aria-current="page"]');
    if (!active) return;
    const center = active.offsetLeft + active.offsetWidth / 2;
    const from = lastActiveCenter;
    lastActiveCenter = center;
    if (from === null || from === center || !barRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    animate(barRef.current, { x: [from - center, 0] }, { type: 'spring', stiffness: 420, damping: 38 });
  }, [location.pathname]);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
      <div ref={rowRef} className="relative flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <button
              key={tab.path}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
              className={clsx(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive ? 'text-brand-blue' : 'text-gray-400'
              )}
            >
              {isActive && <span ref={barRef} aria-hidden="true" className="absolute left-1/2 top-0 -ml-4 h-0.5 w-8 rounded-full bg-brand-blue" />}
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
