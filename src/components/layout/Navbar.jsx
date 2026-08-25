import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Bell, Menu, ChevronDown, LogOut, User, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = ({ onMenuToggle, title, notificationCount = 5 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/logout');
  };

  const handleNavigate = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-brand-dark"
          >
            <Menu size={22} />
          </button>
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <h1 className="hidden lg:block font-sora font-semibold text-lg text-brand-dark">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-brand-dark transition-colors relative"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="font-sora font-semibold text-sm">Notifications</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer">
                        <p className="text-sm text-brand-dark font-inter">Batch verification completed</p>
                        <p className="text-xs text-gray-400 mt-0.5">{i} hour ago</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center">
                    <button className="text-sm text-brand-blue font-medium font-inter hover:underline">
                      View All
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center overflow-hidden text-white text-sm font-semibold">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0] || 'U'
                )}
              </div>
              <span className="hidden md:block text-sm font-medium text-brand-dark font-inter">{user?.name || 'User'}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-brand-dark font-inter">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-400 font-inter">{user?.email || 'No email added'}</p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => handleNavigate('/account/profile')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-brand-dark font-inter"
                    >
                      <User size={16} className="text-gray-400" /> Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/account/wallet')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-brand-dark font-inter"
                    >
                      <Wallet size={16} className="text-gray-400" /> Wallet
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-red-500 font-inter"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
