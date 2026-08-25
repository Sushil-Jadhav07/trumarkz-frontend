import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { adminAPI, getApiError } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  Users,
  UserRound,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  ShieldCheck,
  Briefcase,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const USER_TYPE_TABS = [
  { value: 'all', label: 'All Users' },
  { value: 'organization', label: 'Organization' },
  { value: 'individual', label: 'Individual' },
  { value: 'super-admin', label: 'Super Admin' },
];

const userTypeMeta = {
  organization: { label: 'Organization', bg: 'bg-blue-50', text: 'text-brand-blue', icon: Briefcase },
  individual: { label: 'Individual', bg: 'bg-green-50', text: 'text-green-600', icon: UserRound },
  'super-admin': { label: 'Super Admin', bg: 'bg-purple-50', text: 'text-purple-600', icon: ShieldCheck },
};

const UserTypeBadge = ({ type }) => {
  const meta = userTypeMeta[type] || { label: type || 'Unknown', bg: 'bg-gray-100', text: 'text-gray-600', icon: UserRound };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-inter ${meta.bg} ${meta.text}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

const OrgCard = ({ group, search, typeFilter, index }) => {
  const [expanded, setExpanded] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (group.users || []).filter((u) => {
      const matchesType = typeFilter === 'all' || u.user_type === typeFilter;
      const matchesSearch =
        !q ||
        [u.full_name, u.email, u.user_type]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [group.users, search, typeFilter]);

  if (filteredUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
    >
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-brand-blue" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-brand-dark font-sora truncate">
                {group.organization_name || 'Unnamed Organization'}
              </p>
              <p className="text-xs text-gray-400 font-inter mt-0.5">
                ID: {group.org_id || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue/8 text-brand-blue text-xs font-medium font-inter">
              <Users size={12} />
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100">
                {/* Table header */}
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_minmax(0,1fr)] gap-4 px-5 py-2.5 bg-brand-bg">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter">Name</span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter">Email</span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter">Type</span>
                </div>

                {/* User rows */}
                <div className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <motion.div
                      key={user.id || user.email}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_minmax(0,1fr)] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-brand-blue font-sora uppercase">
                          {(user.full_name?.[0] || user.email?.[0] || '?')}
                        </div>
                        <span className="text-sm font-medium text-brand-dark font-inter truncate">
                          {user.full_name || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-500 font-inter truncate">
                          {user.email || '—'}
                        </span>
                      </div>
                      <div>
                        <UserTypeBadge type={user.user_type} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export const UsersGrouped = () => {
  const navigate = useNavigate();
  const [groupedUsers, setGroupedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsersGrouped();
      setGroupedUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const stats = useMemo(() => {
    const allUsers = groupedUsers.flatMap((g) => g.users || []);
    return {
      orgs: groupedUsers.length,
      total: allUsers.length,
      organization: allUsers.filter((u) => u.user_type === 'organization').length,
      individual: allUsers.filter((u) => u.user_type === 'individual').length,
      superAdmin: allUsers.filter((u) => u.user_type === 'super-admin').length,
    };
  }, [groupedUsers]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && typeFilter === 'all') return groupedUsers;

    return groupedUsers.filter((group) =>
      (group.users || []).some((u) => {
        const matchesType = typeFilter === 'all' || u.user_type === typeFilter;
        const matchesSearch =
          !q ||
          [u.full_name, u.email, u.user_type, group.organization_name]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q));
        return matchesType && matchesSearch;
      })
    );
  }, [groupedUsers, search, typeFilter]);

  return (
    <AuthLayout title="Users by Organization">
      <PageHeader
        title="Users by Organization"
        subtitle="All platform users grouped by their organization"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/create-super-admin')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-blue text-white text-sm font-medium font-inter hover:bg-brand-blue/90 transition-colors shadow-sm"
            >
              <UserPlus size={14} />
              Create Admin
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Organizations', value: stats.orgs, icon: Building2, color: 'text-brand-blue', bg: 'bg-blue-50' },
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-brand-blue', bg: 'bg-blue-50' },
          { label: 'Individual', value: stats.individual, icon: UserRound, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Super Admins', value: stats.superAdmin, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat) => (
          <Card key={stat.label} className="px-4 py-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon size={17} className={stat.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-brand-dark font-sora leading-none">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-xs text-gray-400 font-inter mt-1">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3 mb-5"
      >
        <div className="flex-1 max-w-sm">
          <Input
            type="text"
            placeholder="Search by name, email, or organization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {USER_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTypeFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium font-inter whitespace-nowrap transition-colors ${
                typeFilter === tab.value
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Users size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-brand-dark font-sora">No users found</p>
          <p className="text-xs text-gray-400 font-inter mt-1">
            {search || typeFilter !== 'all' ? 'Try adjusting your search or filter.' : 'No users have been registered yet.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group, i) => (
            <OrgCard
              key={group.org_id || i}
              group={group}
              search={search}
              typeFilter={typeFilter}
              index={i}
            />
          ))}
        </div>
      )}
    </AuthLayout>
  );
};

export default UsersGrouped;
