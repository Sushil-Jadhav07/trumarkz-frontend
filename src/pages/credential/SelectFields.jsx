import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepWizard } from '@/components/ui/StepWizard';
import { QRCode } from '@/components/ui/QRCode';
import { Check, ArrowRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const fieldOptions = [
  { id: 'name', label: 'Name', default: true },
  { id: 'photo', label: 'Photo', default: true },
  { id: 'dob', label: 'DOB', default: true },
  { id: 'uniqueId', label: 'Unique ID', default: true },
  { id: 'status', label: 'Verification Status', default: true },
  { id: 'organization', label: 'Organization', default: false },
];

const slugifyFieldId = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const SelectFields = () => {
  const navigate = useNavigate();
  const { selectedFields, setSelectedFields } = useApp();
  const [customFields, setCustomFields] = useState([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const allFieldOptions = [...fieldOptions, ...customFields];
  const [fields, setFields] = useState(() => {
    if (selectedFields.length > 0) return selectedFields;
    return fieldOptions.filter(f => f.default).map(f => f.id);
  });

  const toggleField = (id) => {
    setFields(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
    );
  };

  const handleAddField = () => {
    const label = newFieldName.trim();
    const value = newFieldValue.trim();
    if (!label) return;

    const idBase = slugifyFieldId(label);
    if (!idBase) {
      toast.error('Enter a valid field name');
      return;
    }

    const exists = allFieldOptions.some((f) => f.id === idBase || f.label.toLowerCase() === label.toLowerCase());
    if (exists) {
      toast.error('Field already exists');
      return;
    }

    const newField = { id: idBase, label, value, default: false, custom: true };
    setCustomFields((prev) => [...prev, newField]);
    setFields((prev) => [...prev, idBase]);
    setNewFieldName('');
    setNewFieldValue('');
    setShowAddField(false);
    toast.success('Field added');
  };

  const handleGenerate = () => {
    if (fields.length === 0) {
      toast.error('Select at least one field');
      return;
    }
    setSelectedFields(fields);
    navigate('/credential/preview');
  };

  const previewData = {
    name: fields.includes('name') ? 'Ravi Kumar' : '',
    uniqueId: fields.includes('uniqueId') ? 'TM-TRN-2026-00394' : '',
    dob: fields.includes('dob') ? '01-Apr-1992' : '',
    status: fields.includes('status') ? 'Verified Driver' : '',
    organization: fields.includes('organization') ? 'OneX Pvt Ltd' : ''
  };
  const selectedCustomFields = customFields.filter(
    (field) => fields.includes(field.id)
  );

  return (
    <AuthLayout title="Select Fields">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard steps={['Template', 'Fields', 'Preview', 'Share']} currentStep={1} />
        <PageHeader title="Select Fields to Include" subtitle="Choose what appears on the credential" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="space-y-3">
              {allFieldOptions.map((field) => {
                const isSelected = fields.includes(field.id);
                return (
                  <motion.div
                    key={field.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleField(field.id)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all',
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/5'
                        : 'border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <div className={clsx(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300'
                    )}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-brand-dark font-inter">{field.label}</span>
                  </motion.div>
                );
              })}
              <button
                type="button"
                onClick={() => setShowAddField(true)}
                className="flex items-center gap-2 text-sm text-brand-blue font-inter hover:underline p-2"
              >
                <Plus size={14} /> Add more fields
              </button>
              {showAddField && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddField();
                      }
                    }}
                    placeholder="Enter field name"
                    className="w-full sm:flex-1 h-10 rounded-lg border border-gray-300 px-3 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddField();
                      }
                    }}
                    placeholder="Enter field value"
                    className="w-full sm:flex-1 h-10 rounded-lg border border-gray-300 px-3 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                  <Button size="sm" className="w-full sm:w-auto" onClick={handleAddField}>Add</Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-sora font-semibold text-brand-dark mb-4">Live Preview</h3>
            <div className="bg-gradient-to-br from-brand-blue to-brand-blue-hover rounded-xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <svg width="60" height="60" viewBox="0 0 48 48" fill="white">
                  <path d="M24 2L6 10V22C6 33.25 14 42.5 24 46C34 42.5 42 33.25 42 22V10L24 2Z" />
                </svg>
              </div>
              <div className="relative z-10">
                <div className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-3">
                  {previewData.status || 'Credential'}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  {fields.includes('photo') && (
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gray-300" />
                    </div>
                  )}
                  <div>
                    {previewData.name && <p className="font-sora font-bold text-lg">{previewData.name}</p>}
                    {previewData.uniqueId && <p className="text-xs opacity-80 font-inter">{previewData.uniqueId}</p>}
                  </div>
                </div>
                <div className="space-y-1 text-xs font-inter opacity-90">
                  {previewData.dob && <p>DOB: {previewData.dob}</p>}
                  {previewData.organization && <p>Org: {previewData.organization}</p>}
                  {selectedCustomFields.map((field) => (
                    <p key={field.id}>{field.label}: {field.value || '-'}</p>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="bg-white p-1 rounded-lg">
                    <QRCode value="TM-TRN-2026-00394" size={48} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="primary" size="lg" onClick={handleGenerate} icon={ArrowRight}>
            Generate
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SelectFields;
