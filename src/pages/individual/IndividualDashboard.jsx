import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockSkillTree } from '@/data/mockData';
import { GitBranch, Award, Share2, ArrowRight, CheckCircle, Clock, Hash } from 'lucide-react';

const sectionStyles = {
  education: 'bg-blue-50 text-brand-blue',
  courses: 'bg-green-50 text-green-600',
  experience: 'bg-purple-50 text-purple-600',
  skills: 'bg-orange-50 text-orange-600',
};

const sectionLabels = {
  education: 'Education',
  courses: 'Course',
  experience: 'Experience',
  skills: 'Skill',
};

const getTitle = (item) => item.level || item.name || item.role || item.skill;
const getSubtitle = (item) => item.institution || item.provider || item.company || '';

export const IndividualDashboard = () => {
  const navigate = useNavigate();

  const allItems = [
    ...mockSkillTree.education.map((i) => ({ ...i, section: 'education' })),
    ...mockSkillTree.courses.map((i) => ({ ...i, section: 'courses' })),
    ...mockSkillTree.experience.map((i) => ({ ...i, section: 'experience' })),
    ...mockSkillTree.skills.map((i) => ({ ...i, section: 'skills' })),
  ];

  const visibleItems = allItems.filter((i) => i.status !== 'empty');
  const previewItems = visibleItems.slice(0, 6);

  const verified = allItems.filter((i) => i.status === 'verified').length;
  const pending = allItems.filter((i) => i.status === 'pending').length;
  const total = visibleItems.length;

  const stats = [
    { label: 'Verified Credentials', value: verified, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Pending Verification', value: pending, icon: Clock, bg: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Total Skill Nodes', value: total, icon: GitBranch, bg: 'bg-blue-50', text: 'text-brand-blue' },
  ];

  const quickActions = [
    { label: 'My Skill Tree', icon: GitBranch, path: '/individual/skill-tree', color: 'bg-brand-blue text-white' },
    { label: 'My Credentials', icon: Award, path: '/individual/credentials', color: 'bg-brand-dark text-white' },
    { label: 'Share Profile', icon: Share2, path: '/individual/share', color: 'bg-green-500 text-white' },
  ];

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
              <p className="text-xs text-gray-500 font-inter mt-0.5">Recent verified and in-progress nodes</p>
            </div>
            <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/individual/skill-tree')}>
              View Full
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {previewItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-inter font-medium ${sectionStyles[item.section]}`}>
                    {sectionLabels[item.section]}
                  </span>
                  <Badge status={item.status === 'verified' ? 'verified' : 'pending'}>
                    {item.status === 'verified' ? 'Verified' : 'Pending'}
                  </Badge>
                </div>

                <p className="text-base font-sora font-semibold text-brand-dark leading-tight">{getTitle(item)}</p>
                <p className="text-sm text-gray-500 font-inter mt-1">
                  {getSubtitle(item) || 'No source specified'}
                  {item.year ? ` · ${item.year}` : ''}
                </p>

                {item.credId && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Hash size={11} className="text-brand-blue" />
                    <span className="text-xs text-brand-blue font-mono">{item.credId}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default IndividualDashboard;
