import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { mockPendingOrgs } from '@/data/mockData';
import { Building2, CheckCircle, Clock, FileText, Landmark, Mail, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const OrgApprovals = () => {
  const [orgs, setOrgs] = useState(mockPendingOrgs);

  const approve = (id) => {
    setOrgs((prev) => prev.filter((org) => org.id !== id));
    toast.success('Organisation approved. Email sent.');
  };

  const reject = (id) => {
    setOrgs((prev) => prev.filter((org) => org.id !== id));
    toast.error('Organisation rejected.');
  };

  const industryCount = new Set(orgs.map((org) => org.industry)).size;

  return (
    <AuthLayout title="Org Approvals">
      <PageHeader title="Organisation Approvals" subtitle="Review registered organisations before granting dashboard access" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Pending Review', value: orgs.length, icon: Clock, surface: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Industries', value: industryCount, icon: Landmark, surface: 'bg-blue-50', text: 'text-brand-blue' },
          { label: 'Ready Actions', value: orgs.length * 2, icon: CheckCircle, surface: 'bg-green-50', text: 'text-green-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
                  <p className="font-sora font-bold text-2xl text-brand-dark mt-1">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${stat.surface} flex items-center justify-center`}>
                  <Icon size={20} className={stat.text} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {orgs.length === 0 ? (
        <Card className="p-10 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-sora font-semibold text-brand-dark">All caught up!</p>
          <p className="text-sm text-gray-400 font-inter">No pending approvals.</p>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-0 overflow-hidden border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-sora font-semibold text-brand-dark">Approval Queue</h3>
                <p className="text-xs text-gray-400 font-inter mt-1">Validate GST, industry, and official email before enabling access.</p>
              </div>
              <Badge status="warning">{orgs.length} Pending</Badge>
            </div>

            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[1040px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Organisation</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">GST Number</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Industry</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Official Email</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Submitted</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Status</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orgs.map((org, index) => (
                    <motion.tr
                      key={org.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{org.name}</p>
                            <p className="text-xs text-gray-400 font-inter">{org.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-brand-dark font-inter flex items-center gap-2">
                          <FileText size={14} className="text-gray-400" />
                          {org.gst}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 font-inter">
                          {org.industry}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-brand-dark font-inter flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          {org.email}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-inter">{org.submittedAt}</td>
                      <td className="px-5 py-4">
                        <Badge status="warning">Pending Review</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="danger" size="sm" icon={XCircle} onClick={() => reject(org.id)}>
                            Reject
                          </Button>
                          <Button variant="success" size="sm" icon={CheckCircle} onClick={() => approve(org.id)}>
                            Approve
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </AuthLayout>
  );
};

export default OrgApprovals;
