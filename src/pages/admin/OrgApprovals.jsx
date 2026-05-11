import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { mockPendingOrgs } from '@/data/mockData';
import { Building2, Mail, FileText, CheckCircle, XCircle, CalendarDays, Landmark } from 'lucide-react';
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

  return (
    <AuthLayout title="Org Approvals">
      <PageHeader title="Organisation Approvals" subtitle={`${orgs.length} pending review`} />

      <div className="space-y-4">
        {orgs.length === 0 && (
          <Card className="p-10 text-center">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <p className="font-sora font-semibold text-brand-dark">All caught up!</p>
            <p className="text-sm text-gray-400 font-inter">No pending approvals.</p>
          </Card>
        )}

        {orgs.map((org, i) => (
          <motion.div
            key={org.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-3 bg-brand-blue/10 rounded-xl shrink-0">
                    <Building2 size={22} className="text-brand-blue" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-sora font-semibold text-brand-dark text-lg leading-tight">{org.name}</h3>
                    <p className="text-xs text-gray-500 font-inter mt-1">Verify organisation details before granting dashboard access</p>
                  </div>
                </div>
                <Badge status="pending">Pending Review</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-inter mb-1 flex items-center gap-1">
                    <FileText size={12} /> GST Number
                  </p>
                  <p className="text-sm font-medium text-brand-dark font-inter break-all">{org.gst}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-inter mb-1 flex items-center gap-1">
                    <Landmark size={12} /> Industry
                  </p>
                  <p className="text-sm font-medium text-brand-dark font-inter">{org.industry}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-inter mb-1 flex items-center gap-1">
                    <Mail size={12} /> Official Email
                  </p>
                  <p className="text-sm font-medium text-brand-dark font-inter break-all">{org.email}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-inter mb-1 flex items-center gap-1">
                    <CalendarDays size={12} /> Submitted
                  </p>
                  <p className="text-sm font-medium text-brand-dark font-inter">{org.submittedAt}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button variant="danger" className="sm:w-auto" icon={XCircle} onClick={() => reject(org.id)}>
                  Reject
                </Button>
                <Button variant="success" className="sm:w-auto" icon={CheckCircle} onClick={() => approve(org.id)}>
                  Approve Organisation
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </AuthLayout>
  );
};

export default OrgApprovals;
