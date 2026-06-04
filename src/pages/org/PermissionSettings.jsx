import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { Globe, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const options = [
  { id: 'open', icon: Globe, title: 'Open Search', subtitle: 'Recommended for drivers, security staff, delivery agents', description: 'Anyone can search and view this credential without asking the worker. Best for roles where public trust is the primary goal.', selectedBorder: 'border-brand-blue bg-brand-blue/5', iconActive: 'bg-brand-blue text-white', radioBorder: 'border-brand-blue bg-brand-blue' },
  { id: 'permission', icon: Lock, title: 'Permission Required', subtitle: 'Recommended for nurses, engineers, sensitive professionals', description: 'Before anyone can search this credential, the worker receives a WhatsApp / email consent request and must approve.', selectedBorder: 'border-orange-400 bg-orange-50', iconActive: 'bg-orange-400 text-white', radioBorder: 'border-orange-400 bg-orange-400' }
];

export const PermissionSettings = () => {
  const navigate = useNavigate();
  const [permission, setPermission] = useState(null);
  const handleContinue = () => {
    if (!permission) { toast.error('Please select a visibility setting'); return; }
    toast.success(`${permission === 'open' ? 'Open search' : 'Permission-based access'} selected`);
    navigate('/org/template');
  };

  return <AuthLayout title="Permission Settings"><div className="w-full mx-auto lg:max-w-none"><StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={2} /><PageHeader title="Credential Visibility" subtitle="Who can search and view the credentials you issue?" /><div className="space-y-4">{options.map((opt, i) => { const isSelected = permission === opt.id; const Icon = opt.icon; return <motion.div key={opt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => setPermission(opt.id)} className={clsx('cursor-pointer rounded-xl border-2 p-5 transition-all', isSelected ? opt.selectedBorder : 'border-gray-100 bg-white hover:border-gray-200')}><div className="flex items-start gap-4"><div className={clsx('p-3 rounded-xl', isSelected ? opt.iconActive : 'bg-gray-100 text-gray-500')}><Icon size={22} /></div><div className="flex-1"><h3 className="font-sora font-semibold text-brand-dark mb-0.5">{opt.title}</h3><p className="text-xs text-gray-400 font-inter mb-2">{opt.subtitle}</p><p className="text-sm text-gray-600 font-inter">{opt.description}</p></div><div className={clsx('w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center shrink-0', isSelected ? opt.radioBorder : 'border-gray-300')}>{isSelected && <div className="w-2 h-2 rounded-full bg-white" />}</div></div></motion.div>; })}</div>{permission === 'permission' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Card className="p-4 mt-4 bg-orange-50 border border-orange-200"><p className="text-sm text-orange-700 font-inter"><span className="font-semibold">How consent works: </span>System sends each worker a WhatsApp or email with an "I Agree" button. Cost (~Rs. 1) included in per-unit fee. For 1,000+ records, a WhatsApp broadcast is used.</p></Card></motion.div>}<div className="mt-8 flex justify-end"><Button variant="primary" size="lg" onClick={handleContinue} icon={ArrowRight}>Continue</Button></div></div></AuthLayout>;
};

export default PermissionSettings;
