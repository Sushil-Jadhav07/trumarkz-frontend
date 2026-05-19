import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Building2, Mail, Phone, Plus, Send, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
// Import the shared verifier directory from BatchMonitor so both pages stay in sync
import { VERIFIER_DIRECTORY } from './BatchMonitor';

// Re-export so other modules can import from here too
export { VERIFIER_DIRECTORY };

const DEFAULT_VERIFIERS = VERIFIER_DIRECTORY.map((v, i) => ({
  ...v,
  contact: ['Ramesh Iyer', 'Neha Kapoor', 'Arjun Menon'][i] || v.name,
  phone: ['+91 98765 41001', '+91 98765 41002', '+91 98765 41003'][i] || '-',
  specialties: [
    ['Identity', 'Employment', 'Address'],
    ['Education', 'Police', 'KYC'],
    ['Product', 'Warranty', 'Document'],
  ][i] || ['General Verification'],
  activeBatches:   [4, 2, 0][i] ?? 0,
  completedBatches:[28,16, 9][i] ?? 0,
}));

export const Verifiers = () => {
  const [verifiers, setVerifiers] = useState(DEFAULT_VERIFIERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', specialties: '', status: 'active' });

  const activeCount       = verifiers.filter((v) => v.status === 'active').length;
  const activeBatches     = verifiers.reduce((s, v) => s + v.activeBatches,    0);
  const completedBatches  = verifiers.reduce((s, v) => s + v.completedBatches, 0);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const resetForm  = () => setForm({ name: '', contact: '', email: '', phone: '', specialties: '', status: 'active' });

  const addVerifier = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim() || !form.email.trim()) {
      toast.error('Please enter agency name, contact person, and email');
      return;
    }
    const next = verifiers.length + 1;
    const specialties = form.specialties.split(',').map((s) => s.trim()).filter(Boolean);
    setVerifiers((prev) => [
      {
        id: `VRF-${String(next).padStart(3, '0')}`,
        name: form.name.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || '-',
        specialties: specialties.length ? specialties : ['General Verification'],
        activeBatches: 0, completedBatches: 0,
        status: form.status,
      },
      ...prev,
    ]);
    setModalOpen(false);
    resetForm();
    toast.success('Verifier added');
  };

  return (
    <AuthLayout title="Agencies">
      <PageHeader
        title="Third-Party Verifiers"
        subtitle="Manage manual verification partners used for batch handoff"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Add Verifier
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Active Agencies',    value: activeCount,      icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Active Batches',     value: activeBatches,    icon: Send,        color: 'text-brand-blue', bg: 'bg-blue-50' },
          { label: 'Completed Batches',  value: completedBatches, icon: Building2,   color: 'text-orange-600', bg: 'bg-orange-50' },
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
            <p className="text-xs text-gray-400 font-inter mt-1">
              Active verifiers in this list are available for selection when sending batch notifications.
            </p>
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
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
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
                        {verifier.specialties.map((s) => (
                          <span key={s} className="px-2 py-1 rounded-lg bg-gray-100 text-xs text-gray-600 font-inter">{s}</span>
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
                      <Button
                        variant="ghost" size="sm" icon={Send}
                        disabled={verifier.status !== 'active'}
                        onClick={() => toast.success(`Test email triggered for ${verifier.name}`)}
                      >
                        Test Mail
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Add Verifier Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Add Verifier" size="lg">
        <form onSubmit={addVerifier} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Agency Name *</label>
            <input value={form.name} onChange={(e) => updateForm('name', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              placeholder="e.g. PrimeVerify Services" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Contact Person *</label>
              <input value={form.contact} onChange={(e) => updateForm('contact', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                placeholder="Contact name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Email *</label>
              <input value={form.email} onChange={(e) => updateForm('email', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                placeholder="ops@agency.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                placeholder="+91 98765 41004" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Specialties</label>
            <input value={form.specialties} onChange={(e) => updateForm('specialties', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              placeholder="Identity, Address, Product" />
            <p className="text-xs text-gray-400 font-inter mt-1">Separate multiple specialties with commas.</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Plus}>Add Verifier</Button>
          </div>
        </form>
      </Modal>
    </AuthLayout>
  );
};

export default Verifiers;
