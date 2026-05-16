import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Building2, Mail, Phone, Plus, Send, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const mockVerifiers = [
  {
    id: 'VRF-001',
    name: 'TrustCheck Verification Services',
    contact: 'Ramesh Iyer',
    email: 'ops@trustcheck.example',
    phone: '+91 98765 41001',
    specialties: ['Identity', 'Employment', 'Address'],
    activeBatches: 4,
    completedBatches: 28,
    status: 'active',
  },
  {
    id: 'VRF-002',
    name: 'SureProof Agencies',
    contact: 'Neha Kapoor',
    email: 'verify@sureproof.example',
    phone: '+91 98765 41002',
    specialties: ['Education', 'Police', 'KYC'],
    activeBatches: 2,
    completedBatches: 16,
    status: 'active',
  },
  {
    id: 'VRF-003',
    name: 'Manual Audit Partner',
    contact: 'Arjun Menon',
    email: 'audit@manualpartner.example',
    phone: '+91 98765 41003',
    specialties: ['Product', 'Warranty', 'Document'],
    activeBatches: 0,
    completedBatches: 9,
    status: 'paused',
  },
];

export const Verifiers = () => {
  const [verifiers] = useState(mockVerifiers);
  const activeCount = verifiers.filter((item) => item.status === 'active').length;
  const activeBatches = verifiers.reduce((sum, item) => sum + item.activeBatches, 0);
  const completedBatches = verifiers.reduce((sum, item) => sum + item.completedBatches, 0);

  return (
    <AuthLayout title="Agencies">
      <PageHeader
        title="Third-Party Verifiers"
        subtitle="Manage manual verification partners used for batch handoff"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => toast.success('Mock verifier creation will be connected to API later')}>
            Add Verifier
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Active Agencies', value: activeCount, icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Active Batches', value: activeBatches, icon: Send, color: 'text-brand-blue', bg: 'bg-blue-50' },
          { label: 'Completed Batches', value: completedBatches, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
                  <p className="font-sora font-bold text-2xl text-brand-dark mt-1">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-sora font-semibold text-brand-dark">Verifier Directory</h3>
            <p className="text-xs text-gray-400 font-inter mt-1">Mock directory until live third-party verifier APIs are available.</p>
          </div>
          <div className="overflow-x-auto scrollbar-hidden">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Agency</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Contact</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Specialties</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Active</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Completed</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {verifiers.map((verifier, index) => (
                  <motion.tr
                    key={verifier.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-dark font-inter">{verifier.name}</p>
                          <p className="text-xs text-gray-400 font-inter">{verifier.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-brand-dark font-inter">{verifier.contact}</p>
                      <p className="text-xs text-gray-400 font-inter flex items-center gap-1 mt-1"><Mail size={12} /> {verifier.email}</p>
                      <p className="text-xs text-gray-400 font-inter flex items-center gap-1 mt-1"><Phone size={12} /> {verifier.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {verifier.specialties.map((specialty) => (
                          <span key={specialty} className="px-2 py-1 rounded-lg bg-gray-100 text-xs text-gray-600 font-inter">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-sm font-semibold text-brand-dark font-inter">{verifier.activeBatches}</td>
                    <td className="px-5 py-4 text-center text-sm font-semibold text-brand-dark font-inter">{verifier.completedBatches}</td>
                    <td className="px-5 py-4">
                      <Badge status={verifier.status === 'active' ? 'success' : 'default'}>
                        {verifier.status === 'active' ? 'Active' : 'Paused'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Button variant="ghost" size="sm" icon={Send} onClick={() => toast.success(`Mock email sent to ${verifier.name}`)}>
                        Send Mail
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </AuthLayout>
  );
};

export default Verifiers;
