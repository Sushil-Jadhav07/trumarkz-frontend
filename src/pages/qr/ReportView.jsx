import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Download, CheckCircle, FileText, Image } from 'lucide-react';
import toast from 'react-hot-toast';

export const ReportView = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <AuthLayout title="Report View">
      <div className="w-full mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/qr/reports')}
          className="flex items-center gap-2 text-sm text-brand-blue font-inter mb-4 hover:underline"
        >
          <ArrowLeft size={14} /> Back to Reports
        </button>

        <PageHeader title="Address Verification Report" subtitle={`Report ID: ${id || 'R2'}`} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-gray-500 font-inter">Verified by</p>
                <p className="font-sora font-semibold text-brand-dark">OneX Pvt Ltd</p>
              </div>
              <Badge status="verified">Verified</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-inter mb-1">Date</p>
                <p className="text-sm font-medium text-brand-dark font-inter">05 Apr 2024</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 font-inter mb-1">Result</p>
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={14} />
                  <span className="text-sm font-medium font-inter">Verified</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="font-sora font-semibold text-brand-dark mb-3">Evidence Photos</h3>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                    <Image size={24} className="text-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Button variant="primary" size="lg" className="w-full" icon={Download} onClick={() => toast.success('PDF downloaded')}>
            Download PDF
          </Button>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default ReportView;
