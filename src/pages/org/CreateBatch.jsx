import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, FileSpreadsheet, FileArchive, Layers, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const mockPreviewRows = [
  { name: 'Ravi Kumar',   dob: '01-Apr-1992', mobile: '9876543210', photo: 'ravi_kumar.jpg' },
  { name: 'Suresh Babu',  dob: '15-Jun-1988', mobile: '9876543211', photo: 'suresh_babu.jpg' },
  { name: 'Anda Sharma',  dob: '22-Mar-1990', mobile: '9876543212', photo: 'anda_sharma.jpg' },
  { name: 'Priya Singh',  dob: '10-Nov-1995', mobile: '9876543213', photo: 'priya_singh.jpg' },
  { name: 'Mohan Das',    dob: '03-Sep-1985', mobile: '9876543214', photo: 'mohan_das.jpg' },
];

export const CreateBatch = () => {
  const navigate = useNavigate();
  const [batchName, setBatchName] = useState('Driver Verification - Apr 2026');
  const totalRecords = 200;
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = () => {
    if (!batchName.trim()) { toast.error('Enter a batch name'); return; }
    toast.success('Batch submitted successfully');
    navigate('/org/batch-status');
  };

  return (
    <AuthLayout title="Create Batch">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={4} />
        <PageHeader title="Create Batch" subtitle="Review and submit your verification batch" />

        <Card className="p-6 space-y-5">
          <Input
            label="Batch Name"
            value={batchName}
            onChange={e => setBatchName(e.target.value)}
            icon={Layers}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 font-inter mb-1">Total Records</p>
              <p className="font-sora font-bold text-xl text-brand-dark">{totalRecords}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 font-inter mb-1">Status</p>
              <Badge status="pending">Pending Submission</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <FileSpreadsheet size={20} className="text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-dark font-inter">driver.xlsx</p>
                <p className="text-xs text-gray-500 font-inter">100 KB</p>
              </div>
              <Badge status="success">Ready</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <FileArchive size={20} className="text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-dark font-inter">images.zip</p>
                <p className="text-xs text-gray-500 font-inter">12.5 MB</p>
              </div>
              <Badge status="success">Ready</Badge>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm text-brand-blue font-inter hover:underline"
            >
              <Eye size={14} />
              {showPreview ? 'Hide' : 'Preview'} uploaded records (showing first 5)
            </button>

            {showPreview && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 overflow-x-auto rounded-xl border border-gray-100"
              >
                <table className="w-full text-xs font-inter">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left p-3 text-gray-500 font-medium">#</th>
                      <th className="text-left p-3 text-gray-500 font-medium">Full Name</th>
                      <th className="text-left p-3 text-gray-500 font-medium">DOB</th>
                      <th className="text-left p-3 text-gray-500 font-medium">Mobile</th>
                      <th className="text-left p-3 text-gray-500 font-medium">Photo File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPreviewRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-3 text-gray-400">{i + 1}</td>
                        <td className="p-3 text-brand-dark font-medium">{row.name}</td>
                        <td className="p-3 text-gray-600">{row.dob}</td>
                        <td className="p-3 text-gray-600">{row.mobile}</td>
                        <td className="p-3 text-brand-blue">{row.photo}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-gray-400">
                        ... and {totalRecords - 5} more records
                      </td>
                    </tr>
                  </tbody>
                </table>
              </motion.div>
            )}
          </div>

          <div className="pt-4">
            <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit} icon={ArrowRight}>
              Submit Batch
            </Button>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default CreateBatch;
