import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { skillsAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
import { Layers, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

const statusBadge = (status) => {
  if (status === 'verified') return { status: 'verified', label: 'Verified' };
  if (status === 'rejected') return { status: 'failed', label: 'Rejected' };
  return { status: 'pending', label: 'Pending' };
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const StatCard = ({ icon: Icon, color, bg, label, value }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-inter">{label}</p>
        <p className="text-xl font-sora font-bold text-brand-dark">{value}</p>
      </div>
    </div>
  </Card>
);

export const AllSkills = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    skillsAPI.getMySkills()
      .then(({ data }) => { if (mounted) setSkills(data.skills || []); })
      .catch((err) => toast.error(getApiError(err, 'Failed to load skills')))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const verifiedCount = skills.filter((s) => s.status === 'verified').length;
  const pendingCount = skills.filter((s) => s.status === 'pending').length;
  const rejectedCount = skills.filter((s) => s.status === 'rejected').length;

  if (loading) {
    return (
      <AuthLayout title="All Skills">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="All Skills">
      <div className="w-full mx-auto lg:max-w-none space-y-6">
        <PageHeader title="All Skills" subtitle="Every skill on your account, straight from GET /skills/me" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Layers} color="text-brand-blue" bg="bg-brand-blue/10" label="Total" value={skills.length} />
          <StatCard icon={CheckCircle} color="text-green-600" bg="bg-green-100" label="Verified" value={verifiedCount} />
          <StatCard icon={Clock} color="text-orange-500" bg="bg-orange-100" label="Pending" value={pendingCount} />
          <StatCard icon={XCircle} color="text-red-500" bg="bg-red-100" label="Rejected" value={rejectedCount} />
        </div>

        {skills.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-gray-400 font-inter">No skills found for this account yet.</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left font-inter font-semibold text-xs text-gray-500 uppercase tracking-wide px-5 py-3">Skill</th>
                    <th className="text-left font-inter font-semibold text-xs text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                    <th className="text-left font-inter font-semibold text-xs text-gray-500 uppercase tracking-wide px-5 py-3">Institution / Degree</th>
                    <th className="text-left font-inter font-semibold text-xs text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                    <th className="text-left font-inter font-semibold text-xs text-gray-500 uppercase tracking-wide px-5 py-3">Verified On</th>
                    <th className="text-left font-inter font-semibold text-xs text-gray-500 uppercase tracking-wide px-5 py-3">Docs</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((item, i) => {
                    const badge = statusBadge(item.status);
                    const institutionLine = [item.institution_name, item.degree].filter(Boolean).join(' — ');
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-brand-dark font-inter">{item.skill_name}</p>
                          {item.skill_info && <p className="text-xs text-gray-400 font-inter mt-0.5">{item.skill_info}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 font-inter capitalize">{item.skill_type}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 font-inter">
                          {institutionLine || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <Badge status={badge.status}>{badge.label}</Badge>
                          {item.status === 'rejected' && item.status_reason && (
                            <p className="text-xs text-red-500 font-inter mt-1 max-w-[180px]">{item.status_reason}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-500 font-inter text-xs">
                          {formatDate(item.verified_at) || '—'}
                        </td>
                        <td className="px-5 py-4 text-gray-500 font-inter text-xs">
                          {item.documents && item.documents.length > 0 ? (
                            <span className="flex items-center gap-1"><FileText size={12} />{item.documents.length}</span>
                          ) : '—'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default AllSkills;
