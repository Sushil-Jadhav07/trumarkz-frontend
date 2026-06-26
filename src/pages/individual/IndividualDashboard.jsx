import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import { GitBranch, Award, Share2, ArrowRight, CheckCircle, Clock, Code2, Heart, GraduationCap, FolderKanban } from 'lucide-react';

const sectionStyles = {
  education: 'bg-blue-50 text-brand-blue',
  technical: 'bg-green-50 text-green-600',
  soft: 'bg-purple-50 text-purple-600',
  project: 'bg-orange-50 text-orange-600',
};

const sectionLabels = {
  education: 'Education',
  technical: 'Technical',
  soft: 'Soft Skill',
  project: 'Project',
};

const statusBadge = (status) => {
  if (status === 'verified') return { status: 'verified', label: 'Verified' };
  if (status === 'rejected') return { status: 'failed', label: 'Rejected' };
  return { status: 'pending', label: 'Pending' };
};

export const IndividualDashboard = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await skillsAPI.getMySkills();
        setSkills(res.data.skills || []);
      } catch (err) {
        toast.error(getApiError(err, 'Failed to load skills'));
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  const verified = skills.filter((s) => s.status === 'verified').length;
  const pending = skills.filter((s) => s.status === 'pending').length;
  const total = skills.length;
  const previewItems = skills.slice(0, 6);

  const stats = [
    { label: 'Verified Skills', value: verified, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Pending Verification', value: pending, icon: Clock, bg: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Total Skills', value: total, icon: GitBranch, bg: 'bg-blue-50', text: 'text-brand-blue' },
  ];

  const quickActions = [
    { label: 'My Skill Tree', icon: GitBranch, path: '/individual/skill-tree', color: 'bg-brand-blue text-white' },
    { label: 'My Credentials', icon: Award, path: '/individual/credentials', color: 'bg-brand-dark text-white' },
    { label: 'Share Profile', icon: Share2, path: '/individual/share', color: 'bg-green-500 text-white' },
  ];

  if (loading) {
    return (
      <AuthLayout title="My Dashboard">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="My Dashboard">
      <div className="space-y-6">
        <PageHeader title="My Dashboard" subtitle="Your verified identity at a glance" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="p-5">
                <div className={`p-2.5 rounded-xl ${stat.bg} w-fit mb-3`}>
                  <stat.icon size={20} className={stat.text} />
                </div>
                <p className="font-sora font-bold text-2xl text-brand-dark">{stat.value}</p>
                <p className="text-sm text-gray-500 font-inter">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div>
          <h3 className="font-sora font-semibold text-lg text-brand-dark mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                className={`${action.color} rounded-xl p-5 text-left transition-shadow hover:shadow-lg`}
              >
                <action.icon size={24} className="mb-3" />
                <p className="font-inter font-semibold text-sm">{action.label}</p>
                <ArrowRight size={16} className="mt-2 opacity-70" />
              </motion.button>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-sora font-semibold text-lg text-brand-dark">Skill Tree Preview</h3>
              <p className="text-xs text-gray-500 font-inter mt-0.5">Recent verified and in-progress skills</p>
            </div>
            <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/individual/skill-tree')}>
              View Full
            </Button>
          </div>

          {previewItems.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="font-sora font-semibold text-brand-dark">No skills added yet</p>
              <p className="text-sm text-gray-400 font-inter mt-1">Start building your verified skill tree</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/individual/skill-tree/build?section=education')}
              >
                Add Your First Skill
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {previewItems.map((item, i) => {
                const badge = statusBadge(item.status);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-inter font-medium ${sectionStyles[item.skill_type] || sectionStyles.technical}`}>
                        {sectionLabels[item.skill_type] || item.skill_type}
                      </span>
                      <Badge status={badge.status}>
                        {badge.label}
                      </Badge>
                    </div>

                    <p className="text-base font-sora font-semibold text-brand-dark leading-tight">
                      {item.skill_name}
                    </p>
                    <p className="text-sm text-gray-500 font-inter mt-1">
                      {item.institution_name || item.skill_info || 'No details specified'}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AuthLayout>
  );
};

export default IndividualDashboard;
