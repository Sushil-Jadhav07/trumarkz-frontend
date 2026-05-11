import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockSkillTree } from '@/data/mockData';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Star,
  Plus,
  Hash,
  ArrowRight,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';

const sections = [
  { key: 'education', label: 'Education', icon: GraduationCap, color: 'text-brand-blue', bg: 'bg-blue-50' },
  { key: 'courses', label: 'Courses & Certifications', icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'experience', label: 'Work Experience', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'skills', label: 'Skills', icon: Star, color: 'text-orange-500', bg: 'bg-orange-50' },
];

const getItemTitle = (item) => item.level || item.name || item.role || item.skill;
const getItemSubtitle = (item) => item.institution || item.provider || item.company || '';

export const SkillTree = () => {
  const navigate = useNavigate();

  const allItems = sections.flatMap((s) => (mockSkillTree[s.key] || []).filter((i) => i.status !== 'empty'));
  const verifiedCount = allItems.filter((i) => i.status === 'verified').length;
  const pendingCount = allItems.filter((i) => i.status === 'pending').length;

  return (
    <AuthLayout title="My Skill Tree">
      <div className="w-full mx-auto lg:max-w-none space-y-6">
        <PageHeader
          title="My Skill Tree"
          subtitle="Your verified digital resume - every item is blockchain-backed"
          action={
            <Button variant="primary" size="sm" icon={ArrowRight} onClick={() => navigate('/individual/share')}>
              Share
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-blue/10">
                <Layers size={18} className="text-brand-blue" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter">Total Entries</p>
                <p className="text-xl font-sora font-bold text-brand-dark">{allItems.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter">Verified</p>
                <p className="text-xl font-sora font-bold text-brand-dark">{verifiedCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter">Pending</p>
                <p className="text-xl font-sora font-bold text-brand-dark">{pendingCount}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sections.map((section, si) => {
            const items = mockSkillTree[section.key] || [];
            const realItems = items.filter((i) => i.status !== 'empty');
            const Icon = section.icon;

            return (
              <motion.div
                key={section.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08 }}
              >
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${section.bg}`}>
                        <Icon size={18} className={section.color} />
                      </div>
                      <div>
                        <h3 className="font-sora font-semibold text-brand-dark">{section.label}</h3>
                        <p className="text-xs text-gray-500 font-inter">{realItems.length} entries</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Plus}
                      onClick={() => navigate(`/individual/skill-tree/build?section=${section.key}`)}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {items
                      .filter((item) => item.status !== 'empty')
                      .map((item, i) => {
                        const title = getItemTitle(item);
                        const subtitle = getItemSubtitle(item);

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-medium text-brand-dark font-inter leading-tight">{title}</p>

                              {subtitle && (
                                <p className="text-sm text-gray-500 font-inter mt-1">
                                  {subtitle}
                                  {item.year ? ` · ${item.year}` : ''}
                                </p>
                              )}

                              {item.credId && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Hash size={11} className="text-brand-blue" />
                                  <span className="text-xs text-brand-blue font-mono">{item.credId}</span>
                                </div>
                              )}
                            </div>

                            <Badge status={item.status === 'verified' ? 'verified' : 'pending'} className="shrink-0 mt-0.5">
                              {item.status === 'verified' ? 'Verified' : 'Pending'}
                            </Badge>
                          </motion.div>
                        );
                      })}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AuthLayout>
  );
};

export default SkillTree;
