import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Layers, Award, Store, BarChart2,
  Wallet, HelpCircle, User, LogOut, ChevronLeft, ChevronRight,
  Shield, GitBranch, Share2, CheckSquare, Building2, DollarSign,
  AlertTriangle, Activity
} from 'lucide-react';
import clsx from 'clsx';

export const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }) => {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCompact = collapsed && !mobileOpen;

  const handleLogout = () => {
    logout();
    onMobileClose?.();
    navigate('/logout');
  };

  const getNavItems = () => {
    if (role === 'organization') {
      return [
        { path: '/org/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/org/industry', label: 'New Verification', icon: Shield },
        { path: '/org/batch-status', label: 'Batches', icon: Layers },
        { path: '/credential/template', label: 'Credentials', icon: Award },
        { path: '/marketplace', label: 'Registry', icon: Store },
        { path: '/qr/reports', label: 'Reports', icon: BarChart2 },
        { path: '/account/wallet', label: 'Wallet', icon: Wallet },
        { path: '/account/support', label: 'Support', icon: HelpCircle },
        { path: '/account/profile', label: 'Profile', icon: User }
      ];
    }
    if (role === 'individual') {
      return [
        { path: '/individual/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/individual/skill-tree', label: 'My Skill Tree', icon: GitBranch },
        { path: '/individual/credentials', label: 'My Credentials', icon: Award },
        { path: '/individual/share', label: 'Share Profile', icon: Share2 },
        { path: '/marketplace', label: 'Registry', icon: Store },
        { path: '/account/wallet', label: 'Wallet', icon: Wallet },
        { path: '/account/support', label: 'Support', icon: HelpCircle },
        { path: '/account/profile', label: 'Profile', icon: User }
      ];
    }
    if (role === 'super-admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/org-approvals', label: 'Org Approvals', icon: CheckSquare },
        { path: '/admin/batch-monitor', label: 'Batch Monitor', icon: Layers },
        { path: '/admin/verifiers', label: 'Agencies', icon: Building2 },
        { path: '/admin/pricing', label: 'Pricing Config', icon: DollarSign },
        { path: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
        { path: '/admin/platform-health', label: 'Platform Health', icon: Activity },
        { path: '/account/profile', label: 'Profile', icon: User }
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <aside className={clsx('fixed left-0 top-0 h-full bg-brand-dark z-50 flex flex-col transition-transform duration-300', 'w-60 -translate-x-full lg:translate-x-0', mobileOpen && 'translate-x-0', isCompact ? 'lg:w-20' : 'lg:w-60')}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!isCompact && <Logo size="sm" dark />}
        <button onClick={() => { if (mobileOpen) onMobileClose?.(); else onToggle(); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          {mobileOpen ? <ChevronLeft size={18} /> : (collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button key={item.path} type="button" onClick={() => { onMobileClose?.(); navigate(item.path); }} className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left', isActive ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-gray-400 hover:text-white hover:bg-white/5')}>
              <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} />
              {!isCompact && <span className="text-sm font-medium font-inter">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        {!isCompact && <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden text-white text-sm font-bold shrink-0">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || 'U')}</div><div className="min-w-0"><p className="text-sm font-medium text-white truncate font-inter">{user?.name || 'User'}</p><p className="text-xs text-gray-400 truncate font-inter">{user?.role || 'Account'}</p></div></div>}
        <button onClick={handleLogout} className={clsx('flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors', isCompact ? 'justify-center w-full py-2' : 'px-3 py-2')}><LogOut size={18} />{!isCompact && <span className="text-sm font-inter">Logout</span>}</button>
      </div>
    </aside>
  );
};

export default Sidebar;
