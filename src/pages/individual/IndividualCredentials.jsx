import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { mockSkillTree } from '@/data/mockData';
import { Award, Hash, Share2, Download, CalendarDays, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const getTitle = (item) => item.level || item.name || item.role || item.skill;
const getSubtitle = (item) => item.institution || item.provider || item.company || '';

export const IndividualCredentials = () => {
  const allItems = useMemo(
    () =>
      [
        ...mockSkillTree.education,
        ...mockSkillTree.courses,
        ...mockSkillTree.experience,
        ...mockSkillTree.skills,
      ].filter((i) => i.status === 'verified' && i.credId),
    []
  );

  const share = () => toast.success('Share link copied');
  const download = () => toast.success('Downloading...');

  return (
    <AuthLayout title="My Credentials">
      <div className="space-y-5">
        <PageHeader title="My Credentials" subtitle="All your blockchain-verified credentials" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="p-5 h-full">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-3 bg-brand-blue/10 rounded-xl shrink-0">
                      <Award size={20} className="text-brand-blue" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-sora font-bold text-3xl text-brand-dark leading-none">{getTitle(item)}</h3>
                      <p className="text-sm text-gray-500 font-inter mt-2">Verified credential details</p>
                    </div>
                  </div>
                  <Badge status="verified" className="shrink-0 mt-1">Verified</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 font-inter mb-1">Institution / Provider</p>
                    <p className="text-sm text-brand-dark font-inter flex items-center gap-1.5">
                      <Building2 size={14} className="text-gray-400" />
                      {getSubtitle(item) || '-'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500 font-inter mb-1">Year</p>
                    <p className="text-sm text-brand-dark font-inter flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-gray-400" />
                      {item.year || '-'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/20 mb-4">
                  <p className="text-xs text-gray-500 font-inter mb-1">Credential ID</p>
                  <p className="text-sm text-brand-blue font-mono break-all flex items-center gap-1.5">
                    <Hash size={12} className="text-brand-blue" />
                    {item.credId}
                  </p>
                </div>

                <div className="mt-auto pt-1 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" icon={Share2} onClick={share}>
                    Share
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1" icon={Download} onClick={download}>
                    Download
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
};

export default IndividualCredentials;
