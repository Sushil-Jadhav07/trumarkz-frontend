import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Layers, Award,
  Wallet, HelpCircle, User, LogOut, ChevronLeft, ChevronRight, ChevronDown,
  GitBranch, Share2, Building2, Briefcase,
  ShieldCheck, UserCog, UserSearch,
  Mail, Package, Star,
} from 'lucide-react';
import clsx from 'clsx';

export const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }) => {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCompact = collapsed && !mobileOpen;

  const handleLogout = async () => {
    await logout();
    onMobileClose?.();
    navigate('/logout');
  };

  const getNavItems = () => {
    if (role === 'organization') {
      return [
        { path: '/org/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/org/batch-status', label: 'Batches', icon: Layers },
        { path: '/qr/reports', label: 'Certificates', icon: Award },
        { path: '/account/wallet', label: 'Wallet', icon: Wallet },
        { path: '/account/support', label: 'Support', icon: HelpCircle },
        { path: '/account/profile', label: 'Profile', icon: User }
      ];
    }
    if (role === 'individual') {
      return [
        { path: '/individual/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/individual/skill-tree', label: 'My Skill Tree', icon: GitBranch },
        { path: '/individual/all-skills', label: 'All Skills', icon: Layers },
        { path: '/individual/credentials', label: 'My Credentials', icon: Award },
        { path: '/individual/share', label: 'Share Profile', icon: Share2 },
        { path: '/account/wallet', label: 'Wallet', icon: Wallet },
        { path: '/account/support', label: 'Support', icon: HelpCircle },
        { path: '/account/profile', label: 'Profile', icon: User }
      ];
    }
    if (role === 'super-admin') {
      // Grouped into labelled sections. SDC Verification stays hidden from the sidebar (still
      // reachable at its route) — add it back here to show it.
      return [
        { section: 'General' },
        { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/admin/batch-monitor', label: 'Batch Monitor', icon: Layers },
        { path: '/admin/organizations', label: 'Organizations', icon: Briefcase },
        { path: '/admin/user-list', label: 'User List', icon: UserSearch },
        { section: 'Operations' },
        { path: '/admin/verifiers', label: 'Verifiers', icon: Building2 },
        { path: '/admin/product-warranty', label: 'Warranty Review', icon: Package },
        { path: '/admin/skills-management', label: 'Skills Review', icon: Star },
        { path: '/admin/email-drafts', label: 'Email Drafts', icon: Mail },
        { section: 'Access' },
        { path: '/admin/promote-super-admin', label: 'Promote Admin', icon: UserCog },
        // Profile is reached from the user card at the bottom (and the top-right menu).
      ];
    }
    return [];
  };

  const navItems = getNavItems();
  const hasSections = navItems.some((item) => item.section);

  return (
    <aside className={clsx('fixed left-0 top-0 h-full bg-brand-dark z-50 flex flex-col transition-transform duration-300', 'w-60 -translate-x-full lg:translate-x-0', mobileOpen && 'translate-x-0', isCompact ? 'lg:w-20' : 'lg:w-60')}>
      <div className={clsx('flex items-center justify-between px-4', hasSections ? 'h-20 pt-2' : 'h-16 border-b border-white/10')}>
        {!isCompact && <Logo size={hasSections ? 'md' : 'sm'} dark />}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close menu' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          onClick={() => { if (mobileOpen) onMobileClose?.(); else onToggle(); }}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          {mobileOpen ? <ChevronLeft size={18} /> : (collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />)}
        </button>
      </div>

      <nav className={clsx('flex-1 px-3 overflow-y-auto', hasSections ? 'py-3' : 'py-4 space-y-1')}>
        {navItems.map((item, index) => {
          if (item.section) {
            if (isCompact) {
              return index === 0 ? null : <div key={item.section} className="mx-2 my-3 border-t border-white/10" />;
            }
            return (
              <div key={item.section} className={clsx(index > 0 && 'mt-4 border-t border-white/10 pt-4')}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 font-inter">{item.section}</p>
              </div>
            );
          }
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button key={item.path} type="button" title={isCompact ? item.label : undefined} aria-label={isCompact ? item.label : undefined} aria-current={isActive ? 'page' : undefined} onClick={() => { onMobileClose?.(); navigate(item.path); }} className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left', hasSections && 'mb-1', isActive ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : clsx(hasSections ? 'text-gray-200' : 'text-gray-400', 'hover:text-white hover:bg-white/5'))}>
              <item.icon size={20} strokeWidth={hasSections ? 1.75 : 2} className={isActive ? 'text-white' : clsx(hasSections ? 'text-gray-300' : 'text-gray-400', 'group-hover:text-white')} />
              {!isCompact && <span className="text-sm font-medium font-inter">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {hasSections ? (
        <div className="px-3 pb-4">
          <div className="border-t border-white/10 pt-4">
            {isCompact ? (
              <button type="button" title="Profile" aria-label="Open profile" onClick={() => { onMobileClose?.(); navigate('/account/profile'); }} className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
                {user?.name?.[0] || 'U'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { onMobileClose?.(); navigate('/account/profile'); }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-sm font-bold text-white">
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (user?.name?.[0] || 'U')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white font-inter">{user?.name || 'User'}</span>
                  <span className="block truncate text-xs text-gray-400 font-inter">{user?.role || 'Account'}</span>
                </span>
                <ChevronDown size={16} className="shrink-0 text-gray-400" />
              </button>
            )}
            <button
              type="button"
              aria-label={isCompact ? 'Sign out' : undefined}
              onClick={handleLogout}
              className={clsx('mt-2 flex items-center gap-3 rounded-xl text-gray-200 transition-colors hover:bg-white/5 hover:text-red-400', isCompact ? 'w-full justify-center py-2.5' : 'w-full px-3 py-2.5')}
            >
              <LogOut size={19} strokeWidth={1.75} />
              {!isCompact && <span className="text-sm font-medium font-inter">Sign out</span>}
            </button>
          </div>
        </div>
      ) : (
      <div className="p-4 border-t border-white/10">
        {!isCompact && <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden text-white text-sm font-bold shrink-0">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || 'U')}</div><div className="min-w-0"><p className="text-sm font-medium text-white truncate font-inter">{user?.name || 'User'}</p><p className="text-xs text-gray-400 truncate font-inter">{user?.role || 'Account'}</p></div></div>}
        <button onClick={handleLogout} className={clsx('flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors', isCompact ? 'justify-center w-full py-2' : 'px-3 py-2')}><LogOut size={18} />{!isCompact && <span className="text-sm font-inter">Logout</span>}</button>
      </div>
      )}
    </aside>
  );
};

export default Sidebar;
