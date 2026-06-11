import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Dropdown } from '@/components/ui/Dropdown';
import { StepWizard } from '@/components/ui/StepWizard';
import { verificationAPI, getApiError, triggerBlobDownload } from '@/services/api';
import { verificationTypes } from '@/data/mockData';
import {
  getHumanTemplateHeaders,
  getIndustryTypeList,
  getProductVerificationTypes,
  getVerificationApiTypes,
} from '@/utils/verificationFlow';
import {
  ArrowRight, FileSpreadsheet, Layers, Eye, Upload,
  CheckCircle, AlertTriangle, XCircle, Users, X, User,
  Package, Plus, ChevronRight, Tag, Download, ClipboardCheck,
  Leaf, Plug, Car, ShieldCheck, BriefcaseMedical, Factory,
  Tractor, Gem, Grid2X2, BadgeCheck, Award, Lock, Globe2
} from 'lucide-react';
import toast from 'react-hot-toast';

const parseTemplateHeaders = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const buildExampleValue = (header) => {
  const key = header.toLowerCase();
  if (key.includes('product')) return 'Example Product';
  if (key.includes('serial')) return 'SN-001';
  if (key.includes('warranty start')) return '2026-05-16';
  if (key.includes('warranty end')) return '2027-05-16';
  if (key.includes('invoice')) return 'INV-001';
  if (key.includes('model')) return 'Model A';
  if (key.includes('batch')) return 'BATCH-001';
  if (key.includes('certificate')) return 'CERT-001';
  if (key.includes('price')) return '1000';
  if (key.includes('date')) return '2026-05-16';
  return `Example ${header}`;
};

const downloadProductTemplateWorkbook = (headers, fileName = 'product-template') => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, headers.map(buildExampleValue)]);
  worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(18, header.length + 4) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

const PRODUCT_SECTOR_DEFS = [
  { id: 'electronics_appliances', title: 'Electronics', description: 'Warranty and serial based certificates for devices and appliances.', icon: Plug, aliases: ['electronics & appliances', 'electronics', 'appliances'], fallbackWarranty: 'required' },
  { id: 'beauty_cosmetics', title: 'Beauty & Cosmetics', description: 'Authenticity certificates with lab reports and batch proofs.', icon: Leaf, aliases: ['beauty & cosmetics', 'beauty products', 'cosmetics', 'personal care'], fallbackWarranty: 'disabled' },
];

const PRODUCT_SERVICE_OPTIONS = [
  { id: 'verification', title: 'Product Verification', description: 'Issue authenticity / compliance certificates for products.', icon: BadgeCheck, warrantyStatus: 'not_applicable' },
  { id: 'warranty', title: 'Warranty', description: 'Create warranty certificates linked to serial numbers.', icon: Award, warrantyStatus: 'active' },
];

const WARRANTY_STATUS_OPTIONS = [
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'void', label: 'Void' },
];

const normalizeCategoryName = (value = '') =>
  value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

const findCategoryForSector = (sector, categories = []) => {
  const aliases = [sector.title, ...sector.aliases].map(normalizeCategoryName);
  return categories.find((category) => {
    const categoryName = normalizeCategoryName(category.category_name);
    return aliases.some((alias) => categoryName.includes(alias) || alias.includes(categoryName));
  }) || null;
};

const buildProductSectors = (categories = []) =>
  PRODUCT_SECTOR_DEFS.map((sector) => {
    const category = findCategoryForSector(sector, categories);
    return {
      ...sector,
      category,
      categoryId: category?.id || '',
      categoryName: category?.category_name || sector.title,
      warrantySupport: category?.warranty_support || sector.fallbackWarranty,
    };
  });

const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

const cardMotion = (index = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.045, duration: 0.24, ease: 'easeOut' },
  whileHover: { y: -3 },
  whileTap: { scale: 0.98 },
});

const selectionCardClass =
  'relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg hover:shadow-blue-100/60 focus:outline-none focus:ring-4 focus:ring-brand-blue/15';

const iconTileClass =
  'flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue transition-all duration-300 group-hover:bg-brand-blue group-hover:text-white';

const BlueRail = () => (
  <span className="absolute inset-y-5 left-0 w-1.5 rounded-r-full bg-brand-blue opacity-90 transition-all duration-300 group-hover:inset-y-4" />
);

const ProductProgress = ({ step }) => {
  const steps = ['Sector', 'Product Details', 'Upload'];
  return (
    <motion.div
      {...pageMotion}
      className="mb-8 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-50"
    >
      <div className="grid grid-cols-3 gap-3 mb-4">
        {steps.map((item, index) => (
          <div key={item} className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-blue"
              initial={false}
              animate={{ width: index <= step ? '100%' : '0%' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 text-xs font-inter font-semibold">
        {steps.map((item, index) => (
          <span key={item} className={index <= step ? 'text-brand-blue' : 'text-gray-400'}>
            {item}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Single Human Modal ───────────────────────────────────────────────────────
const SingleHumanModal = ({ isOpen, onClose, onSuccess, selectedIndustry, selectedVerifications, selectedPermission }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', phone_number: '', email: '',
    dob: '', aadhar_number: '', pan_number: '',
    address_line1: '', address_line2: '', address_line3: '',
    pincode: '', state: '', country: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!form.phone_number.trim()) { toast.error('Phone number is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }

    setLoading(true);
    try {
      const { data } = await verificationAPI.uploadSingleHuman({
        ...form,
        industry_type: getIndustryTypeList(selectedIndustry),
        verification_types: getVerificationApiTypes(selectedVerifications),
        credential_visibility: selectedPermission || 'private',
      });
      toast.success('Human record created! Invite link generated.');
      onSuccess(data);
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to create human record'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      full_name: '', phone_number: '', email: '',
      dob: '', aadhar_number: '', pan_number: '',
      address_line1: '', address_line2: '', address_line3: '',
      pincode: '', state: '', country: '',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Single Human for Verification" size="lg">
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-700 font-inter font-semibold">Required fields: Full Name, Phone Number, Email</p>
        </div>

        {/* Required */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Full Name *" placeholder="John Doe" value={form.full_name} onChange={set('full_name')} icon={User} />
          <Input label="Phone Number *" placeholder="+91 9876543210" value={form.phone_number} onChange={set('phone_number')} />
        </div>
        <Input label="Email *" placeholder="john@example.com" value={form.email} onChange={set('email')} type="email" />

        {/* Optional */}
        <p className="text-xs font-semibold text-gray-400 font-inter uppercase tracking-wider pt-2">Optional Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Date of Birth</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              value={form.dob}
              onChange={set('dob')}
            />
          </div>
          <Input label="Aadhar Number" placeholder="XXXX XXXX XXXX" value={form.aadhar_number} onChange={set('aadhar_number')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="PAN Number" placeholder="ABCDE1234F" value={form.pan_number} onChange={set('pan_number')} />
          <Input label="Pincode" placeholder="400001" value={form.pincode} onChange={set('pincode')} />
        </div>
        <Input label="Address Line 1" placeholder="Flat / House No." value={form.address_line1} onChange={set('address_line1')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Address Line 2" placeholder="Street / Area" value={form.address_line2} onChange={set('address_line2')} />
          <Input label="Address Line 3" placeholder="Landmark" value={form.address_line3} onChange={set('address_line3')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="State" placeholder="Maharashtra" value={form.state} onChange={set('state')} />
          <Input label="Country" placeholder="India" value={form.country} onChange={set('country')} />
        </div>
      </div>

      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
        <Button variant="outline" size="md" className="flex-1" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="primary" size="md" className="flex-1" onClick={handleSubmit} loading={loading} icon={CheckCircle}>
          Create &amp; Generate Invite
        </Button>
      </div>
    </Modal>
  );
};

// ─── Single Product Modal ─────────────────────────────────────────────────────
const SingleProductModal = ({ isOpen, onClose, onSuccess, categories, selectedCategory, selectedService }) => {
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState(selectedCategory?.categoryId || '');
  const [productName, setProductName] = useState('');
  const [warrantyStatus, setWarrantyStatus] = useState(selectedService?.warrantyStatus || 'not_applicable');
  const [customFields, setCustomFields] = useState([{ key: '', value: '' }]);

  const addField = () => setCustomFields((f) => [...f, { key: '', value: '' }]);
  const removeField = (i) => setCustomFields((f) => f.filter((_, idx) => idx !== i));
  const updateField = (i, k, v) =>
    setCustomFields((f) => f.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  useEffect(() => {
    if (!isOpen) return;
    setCategoryId(selectedCategory?.categoryId || '');
    setWarrantyStatus(selectedService?.warrantyStatus || 'not_applicable');
  }, [isOpen, selectedCategory, selectedService]);

  const handleSubmit = async () => {
    if (!categoryId) { toast.error('Please select a category'); return; }
    if (!productName.trim()) { toast.error('Product name is required'); return; }

    const custom_fields = {};
    customFields.forEach(({ key, value }) => {
      if (key.trim()) custom_fields[key.trim()] = value;
    });
    if (selectedService?.id) custom_fields.certificate_type = selectedService.id;

    setLoading(true);
    try {
      const { data } = await verificationAPI.uploadSingleProduct({
        category_id: categoryId,
        product_name: productName,
        custom_fields,
        verification_types: getProductVerificationTypes(selectedService),
        credential_visibility: selectedService?.id === 'verification' ? 'public' : 'private',
      });
      toast.success('Product record created! Invite link generated.');
      onSuccess(data);
      onClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to create product record'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategoryId(selectedCategory?.categoryId || ''); setProductName(''); setWarrantyStatus(selectedService?.warrantyStatus || 'not_applicable');
    setCustomFields([{ key: '', value: '' }]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Single Product${selectedService ? ` - ${selectedService.title}` : ''}`} size="lg">
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-700 font-inter font-semibold">Required: Category &amp; Product Name. Add custom fields as needed.</p>
        </div>

        {/* Category */}
        {selectedCategory?.categoryId ? (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 font-inter mb-1">Product Category</p>
            <p className="text-sm font-semibold text-brand-dark font-inter">
              {selectedCategory.categoryName}
              {selectedService ? ` - ${selectedService.title}` : ''}
            </p>
          </div>
        ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Category *</label>
          <Dropdown
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: '', label: 'Select a category...' },
              ...categories.map((c) => ({ value: c.id, label: c.category_name })),
            ]}
          />
        </div>
        )}

        <Input label="Product Name *" placeholder="e.g. MacBook Pro 16-inch" value={productName} onChange={(e) => setProductName(e.target.value)} icon={Package} />

        <div>
          <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Warranty Status</label>
          <Dropdown
            value={warrantyStatus}
            onChange={setWarrantyStatus}
            options={WARRANTY_STATUS_OPTIONS}
          />
        </div>

        {/* Custom Fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 font-inter">Custom Fields (optional)</p>
            <button onClick={addField} className="flex items-center gap-1 text-xs text-brand-blue font-inter hover:underline">
              <Plus size={12} /> Add field
            </button>
          </div>
          <div className="space-y-2">
            {customFields.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  placeholder="Field name (e.g. serial_number)"
                  value={f.key}
                  onChange={(e) => updateField(i, 'key', e.target.value)}
                />
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  placeholder="Value"
                  value={f.value}
                  onChange={(e) => updateField(i, 'value', e.target.value)}
                />
                {customFields.length > 1 && (
                  <button onClick={() => removeField(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
        <Button variant="outline" size="md" className="flex-1" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="primary" size="md" className="flex-1" onClick={handleSubmit} loading={loading} icon={CheckCircle}>
          Create &amp; Generate Invite
        </Button>
      </div>
    </Modal>
  );
};

// ─── Invite Result Card ───────────────────────────────────────────────────────
const InviteResultCard = ({ result, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="p-4 bg-green-50 rounded-xl border border-green-200 flex gap-3"
  >
    <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-green-800 font-inter">Record created successfully!</p>
      <p className="text-xs text-green-700 font-inter mt-1">Entity ID: {result.entity_id}</p>
      <a
        href={result.invite_link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-brand-blue hover:underline truncate block mt-1 max-w-full"
      >
        {result.invite_link}
      </a>
    </div>
    <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
      <X size={14} />
    </button>
  </motion.div>
);

// ─── Human Bulk Upload Panel ───────────────────────────────────────────────────
const HumanBulkPanel = ({ onResult, selectedIndustry, selectedVerifications, selectedPermission }) => {
  const fileInputRef = useRef(null);
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) { toast.error('Only .xlsx or .xls files are accepted'); return; }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleSubmit = async () => {
    if (!batchName.trim()) { toast.error('Please enter a batch name'); return; }
    if (!selectedFile) { toast.error('Please select an Excel file'); return; }
    setLoading(true); setUploadProgress(0);
    try {
      const { data } = await verificationAPI.bulkUpload(
        selectedFile,
        batchName.trim(),
        description.trim(),
        {
          industryType: getIndustryTypeList(selectedIndustry),
          verificationTypes: getVerificationApiTypes(selectedVerifications),
          credentialVisibility: selectedPermission || 'private',
        },
        setUploadProgress
      );
      setUploadResult(data);
      onResult && onResult(data);
      toast.success(`Uploaded ${data.total_uploaded} records. Batch: ${data.batch_id}`);
    } catch (err) {
      toast.error(getApiError(err, 'Batch upload failed. Please try again.'));
    } finally {
      setLoading(false); setUploadProgress(0);
    }
  };

  const handleGenerateTemplate = async () => {
    setTemplateLoading(true);
    try {
      const { data } = await verificationAPI.generateHumanTemplate(
        getHumanTemplateHeaders(selectedVerifications),
        getVerificationApiTypes(selectedVerifications)
      );
      triggerBlobDownload(data, 'trumarkz-human-template.xlsx');
      toast.success('Template downloaded.');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to generate template'));
    } finally {
      setTemplateLoading(false);
    }
  };

  if (uploadResult) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-green-50"><CheckCircle size={22} className="text-green-600" /></div>
            <div>
              <h3 className="font-sora font-semibold text-brand-dark">Batch Created Successfully</h3>
              <p className="text-xs text-gray-500 font-inter truncate">ID: {uploadResult.batch_id}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Uploaded', value: uploadResult.total_uploaded, color: 'bg-green-500' },
              { label: 'Skipped', value: uploadResult.total_skipped, color: 'bg-orange-400' },
              { label: 'Errors', value: uploadResult.errors?.length || 0, color: 'bg-red-500' },
            ].map((s) => (
              <div key={s.label} className={`${s.color} text-white rounded-xl p-4 text-center`}>
                <p className="font-sora font-bold text-2xl">{s.value}</p>
                <p className="text-xs opacity-85 font-inter">{s.label}</p>
              </div>
            ))}
          </div>
          {uploadResult.successful_users?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-brand-dark font-inter flex items-center gap-2">
                  <Users size={14} className="text-green-600" /> Uploaded Users &amp; Invite Links
                </h4>
                <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-brand-blue font-inter hover:underline flex items-center gap-1">
                  <Eye size={12} />{showPreview ? 'Hide' : 'Show all'}
                </button>
              </div>
              <AnimatePresence>
                {showPreview && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-xs font-inter">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left p-3 text-gray-500 font-medium">#</th>
                            <th className="text-left p-3 text-gray-500 font-medium">Name</th>
                            <th className="text-left p-3 text-gray-500 font-medium">Email</th>
                            <th className="text-left p-3 text-gray-500 font-medium">Invite Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.successful_users.map((u, i) => (
                            <tr key={u.user_id || i} className="border-b border-gray-50">
                              <td className="p-3 text-gray-400">{i + 1}</td>
                              <td className="p-3 font-medium text-brand-dark">{u.full_name}</td>
                              <td className="p-3 text-gray-600">{u.email}</td>
                              <td className="p-3">
                                <a href={u.invite_link} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline truncate block max-w-[180px]">{u.invite_link}</a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </Card>
        {uploadResult.skipped_users?.length > 0 && (
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-orange-600 font-inter flex items-center gap-2 mb-3">
              <AlertTriangle size={14} />Skipped Rows ({uploadResult.skipped_users.length})
            </h4>
            <div className="space-y-2">
              {uploadResult.skipped_users.map((s, i) => (
                <div key={i} className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <p className="text-xs font-medium text-orange-800 font-inter">Row {s.row}: {s.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        {uploadResult.errors?.length > 0 && (
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-red-600 font-inter flex items-center gap-2 mb-3">
              <XCircle size={14} />Errors ({uploadResult.errors.length})
            </h4>
            <div className="space-y-2">
              {uploadResult.errors.map((e, i) => (
                <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-medium text-red-800 font-inter">Row {e.row} — {e.field}: {e.error}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/org/batch-status')} icon={ArrowRight}>
          View Batch Status
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <Input label="Batch Name *" placeholder="e.g. Driver Verification - May 2026" value={batchName} onChange={(e) => setBatchName(e.target.value)} icon={Layers} />
      <div>
        <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Description (optional)</label>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
          rows={2} placeholder="Add a short description…" value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700 font-inter mb-1">Required Excel columns</p>
            <p className="text-xs text-blue-600 font-inter">
              <span className="font-semibold">full_name</span>, <span className="font-semibold">email</span>, <span className="font-semibold">phone_number</span>
              {' '}plus optional verification-specific columns. The backend template also appends the locked <span className="font-semibold">Photo</span> column.
            </p>
          </div>
          <Button variant="outline" size="sm" icon={Download} onClick={handleGenerateTemplate} loading={templateLoading}>
            Template
          </Button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 font-inter mb-2">Excel File (.xlsx / .xls) *</label>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
        {selectedFile ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <FileSpreadsheet size={22} className="text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-dark font-inter truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 font-inter">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setSelectedFile(null); fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
            <Badge status="success">Ready</Badge>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand-blue hover:bg-blue-50/40 transition-all"
          >
            <Upload size={24} className="text-gray-400" />
            <span className="text-sm text-gray-500 font-inter">Click to select your Excel file</span>
            <span className="text-xs text-gray-400 font-inter">.xlsx or .xls</span>
          </button>
        )}
      </div>
      {loading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 font-inter">
            <span>Uploading…</span><span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <motion.div className="bg-brand-blue h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} />
          </div>
        </div>
      )}
      <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit} icon={ArrowRight} disabled={loading || !selectedFile || !batchName.trim()}>
        {loading ? 'Uploading…' : 'Submit Batch'}
      </Button>
    </div>
  );
};

// ─── Product Bulk Upload Panel ─────────────────────────────────────────────────
const ProductBulkPanel = ({ categories, onResult, selectedCategory, selectedService, selectedPermission }) => {
  const fileInputRef = useRef(null);
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(selectedCategory?.categoryId || '');
  const [numberOfUnits, setNumberOfUnits] = useState('');
  const [visibility, setVisibility] = useState(selectedPermission || 'private');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateHeaders, setTemplateHeaders] = useState(
    selectedService?.id === 'warranty'
      ? 'product_name,serial_number,warranty_start_date,warranty_end_date,invoice_number'
      : 'product_name,serial_number,model,batch_number,certificate_number'
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedCategory?.categoryId) setCategoryId(selectedCategory.categoryId);
  }, [selectedCategory]);

  useEffect(() => {
    setTemplateHeaders(
      selectedService?.id === 'warranty'
        ? 'product_name,serial_number,warranty_start_date,warranty_end_date,invoice_number'
        : 'product_name,serial_number,model,batch_number,certificate_number'
    );
  }, [selectedService]);

  useEffect(() => {
    setVisibility(selectedPermission || 'private');
  }, [selectedPermission]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) { toast.error('Only .xlsx or .xls files are accepted'); return; }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleSubmit = async () => {
    if (!batchName.trim()) { toast.error('Please enter a batch name'); return; }
    if (!categoryId) { toast.error('Please select a category'); return; }
    if (!selectedFile) { toast.error('Please select an Excel file'); return; }
    setLoading(true); setUploadProgress(0);
    try {
      const { data } = await verificationAPI.bulkUploadProducts(
        selectedFile,
        batchName.trim(),
        categoryId,
        description.trim(),
        {
          verificationTypes: getProductVerificationTypes(selectedService),
          credentialVisibility: visibility,
        },
        setUploadProgress
      );
      setUploadResult(data);
      onResult && onResult(data);
      toast.success(`Uploaded ${data.total_uploaded} products. Batch: ${data.batch_id}`);
    } catch (err) {
      toast.error(getApiError(err, 'Product batch upload failed. Please try again.'));
    } finally {
      setLoading(false); setUploadProgress(0);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!categoryId) { toast.error('Please select a category first'); return; }
    const headers = parseTemplateHeaders(templateHeaders);
    if (headers.length === 0) { toast.error('Add at least one template column'); return; }
    if (headers[0].trim().toLowerCase().replace(/\s+/g, '_') !== 'product_name') {
      toast.error('First column must be product_name for product batch upload');
      return;
    }

    setTemplateLoading(true);
    try {
      const normalizedHeaders = headers.map((header) =>
        header.trim().toLowerCase().replace(/\s+/g, '_')
      );
      const { data } = await verificationAPI.generateProductTemplate(categoryId, normalizedHeaders);
      triggerBlobDownload(data, `${batchName.trim() || 'product-template'}.xlsx`);
      toast.success('Template downloaded.');
    } catch (err) {
      downloadProductTemplateWorkbook(headers, batchName.trim() || 'product-template');
      toast.success('Template downloaded using the local fallback.');
    } finally {
      setTemplateLoading(false);
    }
  };

  const currentTemplateHeaders = parseTemplateHeaders(templateHeaders);

  if (uploadResult) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-blue-50"><CheckCircle size={22} className="text-brand-blue" /></div>
            <div>
              <h3 className="font-sora font-semibold text-brand-dark">Product Batch Created</h3>
              <p className="text-xs text-gray-500 font-inter truncate">ID: {uploadResult.batch_id}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Uploaded', value: uploadResult.total_uploaded, color: 'bg-brand-blue' },
              { label: 'Skipped', value: uploadResult.total_skipped, color: 'bg-orange-400' },
              { label: 'Errors', value: uploadResult.errors?.length || 0, color: 'bg-red-500' },
            ].map((s) => (
              <div key={s.label} className={`${s.color} text-white rounded-xl p-4 text-center`}>
                <p className="font-sora font-bold text-2xl">{s.value}</p>
                <p className="text-xs opacity-85 font-inter">{s.label}</p>
              </div>
            ))}
          </div>
          {uploadResult.successful_users?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-brand-dark font-inter flex items-center gap-2">
                  <Package size={14} className="text-brand-blue" /> Uploaded Products &amp; Invite Links
                </h4>
                <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-brand-blue font-inter hover:underline flex items-center gap-1">
                  <Eye size={12} />{showPreview ? 'Hide' : 'Show all'}
                </button>
              </div>
              <AnimatePresence>
                {showPreview && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-xs font-inter">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left p-3 text-gray-500 font-medium">#</th>
                            <th className="text-left p-3 text-gray-500 font-medium">Product</th>
                            <th className="text-left p-3 text-gray-500 font-medium">Invite Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.successful_users.map((u, i) => (
                            <tr key={u.entity_id || i} className="border-b border-gray-50">
                              <td className="p-3 text-gray-400">{i + 1}</td>
                              <td className="p-3 font-medium text-brand-dark">{u.product_name || u.full_name || `Product ${i + 1}`}</td>
                              <td className="p-3">
                                <a href={u.invite_link} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline truncate block max-w-[200px]">{u.invite_link}</a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </Card>
        <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/org/batch-status')} icon={ArrowRight}>
          View Batch Status
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <Input label="Batch Name *" placeholder="e.g. Warranty Cards - May 2026" value={batchName} onChange={(e) => setBatchName(e.target.value)} icon={Layers} />
      <div>
        <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Category *</label>
        {selectedCategory?.categoryId ? (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 font-inter mb-1">Product Category</p>
            <p className="text-sm font-semibold text-brand-dark font-inter">
              {selectedCategory.categoryName}
              {selectedService ? ` - ${selectedService.title}` : ''}
            </p>
          </div>
        ) : (
        <Dropdown
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: '', label: 'Select a product category...' },
            ...categories.map((c) => ({
              value: c.id,
              label: `${c.category_name}${c.warranty_support ? ' - Warranty' : ''}`,
            })),
          ]}
        />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Description (optional)</label>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
          rows={2} placeholder="Add a short description…" value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Input label="Number of Units" placeholder="e.g. 100" value={numberOfUnits} onChange={(e) => setNumberOfUnits(e.target.value)} />
      <div>
        <p className="text-sm font-semibold text-brand-dark font-inter mb-2">Blockchain Visibility</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'public', label: 'Public', icon: Globe2 },
            { id: 'private', label: 'Private', icon: Lock },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setVisibility(option.id)}
              className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                visibility === option.id ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <span className="flex items-center gap-3 font-inter font-semibold text-brand-dark">
                <option.icon size={18} className="text-brand-blue" />
                {option.label}
              </span>
              {visibility === option.id && <CheckCircle size={18} className="text-brand-blue" />}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold text-blue-700 font-inter mb-1">Excel format for products</p>
            <p className="text-xs text-blue-600 font-inter">
              First row = column headers. Generate a template, fill it offline, then upload the completed Excel file.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <input
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white"
              value={templateHeaders}
              onChange={(e) => setTemplateHeaders(e.target.value)}
              placeholder="product_name,serial_number,purchase_date"
            />
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleGenerateTemplate}
              loading={templateLoading}
              disabled={!categoryId}
            >
              Template
            </Button>
          </div>
          {currentTemplateHeaders.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentTemplateHeaders.map((header) => (
                <span key={header} className="rounded-lg bg-white border border-blue-100 px-2 py-1 text-[11px] text-blue-700 font-inter">
                  {header}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 font-inter mb-2">Excel File (.xlsx / .xls) *</label>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
        {selectedFile ? (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <FileSpreadsheet size={22} className="text-brand-blue flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-dark font-inter truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 font-inter">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setSelectedFile(null); fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
            <Badge status="success">Ready</Badge>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-blue-200 rounded-xl hover:border-brand-blue hover:bg-blue-50/40 transition-all"
          >
            <Upload size={24} className="text-brand-blue" />
            <span className="text-sm text-gray-500 font-inter">Click to select your Excel file</span>
            <span className="text-xs text-gray-400 font-inter">.xlsx or .xls</span>
          </button>
        )}
      </div>
      {loading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 font-inter">
            <span>Uploading…</span><span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <motion.div className="bg-brand-blue h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} />
          </div>
        </div>
      )}
      <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit} icon={ArrowRight} disabled={loading || !selectedFile || !batchName.trim() || !categoryId}>
        {loading ? 'Uploading…' : 'Submit Product Batch'}
      </Button>
    </div>
  );
};

// ─── Main CreateBatch Page ─────────────────────────────────────────────────────
export const CreateBatch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const flowBatchType = location.state?.batchType || null;
  const flowSubMode = location.state?.subMode || null;
  const {
    batchEntityType, setBatchEntityType,
    selectedIndustry,
    setSelectedIndustry,
    selectedVerifications,
    setSelectedVerifications,
    selectedPermission,
    setSelectedTemplate,
    setSelectedFields,
    setSelectedProductSector,
    setSelectedProductVerifications,
    setSelectedProductService,
    setProductBatchData,
  } = useApp();

  const arrivedFromVerificationFlow = location.state?.fromVerificationFlow === true;
  const hasVerificationFlow =
    arrivedFromVerificationFlow &&
    (Array.isArray(selectedIndustry) ? selectedIndustry.length > 0 : !!selectedIndustry) &&
    selectedVerifications.length > 0;
  const selectedIndustryList = Array.isArray(selectedIndustry)
    ? selectedIndustry
    : (selectedIndustry ? [selectedIndustry] : []);
  const selectedIndustryPrimary = selectedIndustryList[0] || null;
  const selectedIndustryLabel = selectedIndustryList.map((industry) => industry?.name).filter(Boolean).join(', ');
  const inferredBatchType =
    selectedIndustryList.some((industry) => industry?.id === 'products') || selectedVerifications.includes('compliance')
      ? 'product'
      : 'human';
  const selectedVerificationNames = selectedVerifications
    .map((id) => verificationTypes.find((item) => item.id === id)?.name)
    .filter(Boolean);

  // 'human' | 'product' | null
  const [batchType, setBatchType] = useState(flowBatchType);
  // 'single' | 'bulk' | null
  const [subMode, setSubMode] = useState(flowSubMode);

  // Modals
  const [showSingleHumanModal, setShowSingleHumanModal] = useState(false);
  const [showSingleProductModal, setShowSingleProductModal] = useState(false);

  // Results from single-add actions
  const [singleResults, setSingleResults] = useState([]);

  // Categories (for product flow — kept for legacy inline product panels)
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Load categories when product type is selected
  useEffect(() => {
    if (batchType === 'product' && categories.length === 0) {
      setCategoriesLoading(true);
      verificationAPI.getCategories()
        .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
        .catch(() => toast.error('Failed to load product categories'))
        .finally(() => setCategoriesLoading(false));
    }
  }, [batchType]);

  // If the user came through Industry -> Verifications -> Template, preserve that
  // context and continue at the final batch creation step.
  useEffect(() => {
    if (hasVerificationFlow && !batchType) {
      setBatchType(inferredBatchType);
    }
  }, [hasVerificationFlow, inferredBatchType, batchType]);

  useEffect(() => {
    if (!hasVerificationFlow || !batchType || subMode) return;

    if (batchType === 'human') {
      setSubMode(flowSubMode || 'bulk');
    }
  }, [hasVerificationFlow, batchType, subMode, flowSubMode]);

  const startHumanFlow = () => {
    setBatchEntityType('human');
    setSelectedIndustry(null);
    setSelectedVerifications([]);
    setSelectedTemplate(null);
    setSelectedFields([]);
    navigate('/org/industry');
  };

  const startProductFlow = () => {
    setSelectedProductSector(null);
    setSelectedProductVerifications([]);
    setSelectedProductService(null);
    setProductBatchData(null);
    navigate('/org/product/sector');
  };

  const resetProductStep = () => {
    setSubMode(null);
    setSelectedProductService(null);
    setSelectedProductSector(null);
  };

  const handleSingleSuccess = (data) => {
    setSingleResults((prev) => [data, ...prev]);
  };

  // Step 1: Choose batch type
  if (!batchType) {
    return (
      <AuthLayout title="Create Batch">
        <div className="w-full mx-auto lg:max-w-none">
          <PageHeader
            title="Create Verification Batch"
            subtitle="Start a verification flow for people or products"
          />
          <motion.div {...pageMotion} className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
            {/* Human Verification */}
            <motion.button
              {...cardMotion(0)}
              onClick={startHumanFlow}
              className={`${selectionCardClass} group min-h-[240px] text-left`}
            >
              <BlueRail />
              <div className={iconTileClass}>
                <Users size={28} />
              </div>
              <h3 className="font-sora font-bold text-xl text-brand-dark mt-5 mb-2">Human Verification</h3>
              <p className="text-sm text-gray-500 font-inter leading-relaxed">
                Select industry and verification checks, then upload single users or bulk import via Excel.
              </p>
              <div className="flex items-center gap-1 mt-4 text-brand-blue text-sm font-inter font-medium">
                Select <ChevronRight size={16} />
              </div>
            </motion.button>

            {/* Product Verification */}
            <motion.button
              {...cardMotion(1)}
              onClick={startProductFlow}
              className={`${selectionCardClass} group min-h-[240px] text-left`}
            >
              <BlueRail />
              <div className={iconTileClass}>
                <Package size={28} />
              </div>
              <h3 className="font-sora font-bold text-xl text-brand-dark mt-5 mb-2">Product Verification</h3>
              <p className="text-sm text-gray-500 font-inter leading-relaxed">
                Verify products with custom fields and categories. Add single items or bulk upload via Excel.
              </p>
              <div className="flex items-center gap-1 mt-4 text-brand-blue text-sm font-inter font-medium">
                Select <ChevronRight size={16} />
              </div>
            </motion.button>
          </motion.div>
        </div>
      </AuthLayout>
    );
  }

  if (batchType === 'product' && !selectedProductSector) {
    const productSectors = buildProductSectors(categories);
    return (
      <AuthLayout title="Select Sector">
        <div className="w-full mx-auto lg:max-w-none">
          <ProductProgress step={0} />
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setBatchType(null)} className="text-sm text-gray-400 hover:text-brand-blue font-inter transition-colors">
              ← Back
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500 font-inter">Product Verification</span>
          </div>
          <PageHeader
            title="Select Product Sector"
            subtitle="Choose the sector category for this product verification batch"
          />

          {categoriesLoading ? (
            <Card className="p-10 text-center text-sm text-gray-400 font-inter">Loading product sectors...</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {productSectors.map((sector, index) => (
                <motion.button
                  key={sector.id}
                  {...cardMotion(index)}
                  onClick={() => {
                    setSelectedProductSector(sector);
                    if (sector.id !== 'consumer_goods') {
                      setSelectedProductService(PRODUCT_SERVICE_OPTIONS[0]);
                    }
                  }}
                  className={`${selectionCardClass} group min-h-[190px] text-center`}
                >
                  <div className={`${iconTileClass} mx-auto`}>
                    <sector.icon size={28} />
                  </div>
                  <h3 className="font-sora font-semibold text-lg text-brand-dark mb-2">{sector.title}</h3>
                  <p className="text-sm text-gray-500 font-inter line-clamp-2">{sector.description}</p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </AuthLayout>
    );
  }

  if (batchType === 'product' && selectedProductSector?.id === 'consumer_goods' && !selectedProductService) {
    return (
      <AuthLayout title="Select Service">
        <div className="w-full mx-auto lg:max-w-none">
          <ProductProgress step={0} />
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelectedProductSector(null)} className="text-sm text-gray-400 hover:text-brand-blue font-inter transition-colors">
              ← Back
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500 font-inter">{selectedProductSector.title}</span>
          </div>
          <PageHeader
            title="Consumer Goods"
            subtitle="Choose what you want to create for this batch"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {PRODUCT_SERVICE_OPTIONS.map((service, index) => (
              <motion.button
                key={service.id}
                {...cardMotion(index)}
                onClick={() => setSelectedProductService(service)}
                className={`${selectionCardClass} group min-h-[180px] text-left`}
              >
                <BlueRail />
                <div className="flex items-start gap-5">
                  <div className={iconTileClass}>
                    <service.icon size={28} />
                  </div>
                  <div>
                    <h3 className="font-sora font-bold text-xl text-brand-dark mb-2">{service.title}</h3>
                    <p className="text-sm text-gray-500 font-inter leading-relaxed">{service.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </AuthLayout>
    );
  }

  const isHuman = batchType === 'human';
  const activeProductService = selectedProductService || PRODUCT_SERVICE_OPTIONS[0];
  const productActionTitle = selectedProductSector
    ? selectedProductSector.id === 'consumer_goods'
      ? activeProductService.title
      : 'Add Products'
    : 'Product Verification';

  // Step 2: Choose single vs bulk
  if (!subMode) {
    return (
      <AuthLayout title="Create Batch">
        <div className="w-full mx-auto lg:max-w-none">
          {!isHuman && <ProductProgress step={1} />}
          {hasVerificationFlow && (
            <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={4} />
          )}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                if (hasVerificationFlow) navigate('/org/template');
                else if (isHuman) setBatchType(null);
                else if (selectedProductSector?.id === 'consumer_goods' && selectedProductService) setSelectedProductService(null);
                else resetProductStep();
              }}
              className="text-sm text-gray-400 hover:text-brand-blue font-inter flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50">
              {isHuman ? <Users size={14} className="text-brand-blue" /> : <Package size={14} className="text-brand-blue" />}
              <span className="text-sm font-medium font-inter text-brand-blue">
                {isHuman ? 'Human Verification' : 'Product Verification'}
              </span>
            </div>
          </div>

          <PageHeader
            title={isHuman ? 'Human Verification' : productActionTitle}
            subtitle="Choose how you want to add records"
          />

          {!isHuman && selectedProductSector && (
            <Card className="p-4 mb-5 border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <p className="font-sora font-semibold text-brand-dark text-sm">
                    {selectedProductSector.categoryName}
                    {selectedProductSector.id === 'consumer_goods' ? ` - ${activeProductService.title}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 font-inter mt-1">
                    Warranty support: {selectedProductSector.warrantySupport}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={resetProductStep}>Change Sector</Button>
              </div>
            </Card>
          )}

          {hasVerificationFlow && (
            <Card className="p-4 mb-5 border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <p className="font-sora font-semibold text-brand-dark text-sm">
                    {selectedIndustryLabel || 'Selected industry'} verification batch
                  </p>
                  <p className="text-xs text-gray-500 font-inter mt-1">
                    {selectedVerificationNames.length > 0
                      ? selectedVerificationNames.join(' • ')
                      : 'Verification checks selected'}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={() => { setBatchEntityType(batchType || 'human'); navigate('/org/industry'); }}>Change Industry</Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/org/verifications')}>Change Checks</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Single results from previous adds */}
          {singleResults.length > 0 && (
            <div className="mb-4 space-y-2">
              <AnimatePresence>
                {singleResults.map((r, i) => (
                  <InviteResultCard
                    key={r.entity_id || i}
                    result={r}
                    onDismiss={() => setSingleResults((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Single */}
            <motion.button
              {...cardMotion(0)}
              onClick={() => isHuman ? setShowSingleHumanModal(true) : setShowSingleProductModal(true)}
              className={`${selectionCardClass} group min-h-[230px] text-left`}
            >
              <BlueRail />
              <div className={iconTileClass}>
                {isHuman
                  ? <User size={28} />
                  : <Tag size={28} />
                }
              </div>
              <h3 className="font-sora font-bold text-lg text-brand-dark mt-5 mb-2">
                Single {isHuman ? 'Human' : 'Product'}
              </h3>
              <p className="text-sm text-gray-500 font-inter leading-relaxed">
                {isHuman
                  ? 'Add one individual for verification. Fill in their details and generate an invite link instantly.'
                  : 'Add one product and generate an invite link for product documents or images.'}
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm font-inter font-medium text-brand-blue">
                <Plus size={14} /> {isHuman ? 'Add Single Human' : 'Single Product'}
              </div>
            </motion.button>

            {/* Bulk */}
            <motion.button
              {...cardMotion(1)}
              onClick={() => setSubMode('bulk')}
              className={`${selectionCardClass} group min-h-[230px] text-left`}
            >
              <BlueRail />
              <div className={iconTileClass}>
                <FileSpreadsheet size={28} />
              </div>
              <h3 className="font-sora font-bold text-lg text-brand-dark mt-5 mb-2">
                Bulk {isHuman ? 'Human' : 'Product'} Upload
              </h3>
              <p className="text-sm text-gray-500 font-inter leading-relaxed">
                {isHuman
                  ? 'Import multiple individuals at once using an Excel file. Creates invite tokens for each user.'
                  : 'Add batch metadata, generate a template, and upload multiple products via Excel.'}
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm font-inter font-medium text-brand-blue">
                <Upload size={14} /> Bulk Upload
              </div>
            </motion.button>
          </div>

          {/* Modals */}
          <SingleHumanModal
            isOpen={showSingleHumanModal}
            onClose={() => setShowSingleHumanModal(false)}
            onSuccess={handleSingleSuccess}
            selectedIndustry={selectedIndustry}
            selectedVerifications={selectedVerifications}
            selectedPermission={selectedPermission}
          />
          <SingleProductModal
            isOpen={showSingleProductModal}
            onClose={() => setShowSingleProductModal(false)}
            onSuccess={handleSingleSuccess}
            categories={categories}
            selectedCategory={selectedProductSector}
            selectedService={activeProductService}
          />
        </div>
      </AuthLayout>
    );
  }

  // Step 3: Bulk upload form
  return (
    <AuthLayout title="Create Batch">
      <div className="w-full mx-auto lg:max-w-none">
        {!isHuman && <ProductProgress step={1} />}
        {hasVerificationFlow && (
          <StepWizard steps={['Industry', 'Verifications', 'Permissions', 'Template', 'Batch']} currentStep={4} />
        )}
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => {
              if (hasVerificationFlow) navigate('/org/template');
              else if (isHuman) setBatchType(null);
              else setSubMode(null);
            }}
            className="text-sm text-gray-400 hover:text-brand-blue font-inter transition-colors"
          >
            ← Back
          </button>
          <span className="text-gray-300">/</span>
          <button
            onClick={() => setSubMode(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium font-inter transition-colors bg-blue-50 text-brand-blue"
          >
            {isHuman ? <Users size={14} /> : <Package size={14} />}
            {isHuman ? 'Human Verification' : 'Product Verification'}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500 font-inter">Bulk Upload</span>
        </div>

        <PageHeader
          title={isHuman ? 'Bulk Human Upload' : 'Bulk Product Upload'}
          subtitle={isHuman
            ? 'Upload an Excel file to create a batch of individuals for verification'
            : 'Add batch metadata and upload an Excel file to create product certificates'}
        />

        {hasVerificationFlow && (
          <Card className="p-4 mb-5 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                  <p className="font-sora font-semibold text-brand-dark text-sm">
                  {selectedIndustryLabel || 'Selected industry'} verification batch
                </p>
                <p className="text-xs text-gray-500 font-inter mt-1">
                  {selectedVerificationNames.length > 0
                    ? selectedVerificationNames.join(' • ')
                    : 'Verification checks selected'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/org/verifications')}>
                Change Checks
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          {isHuman
            ? <HumanBulkPanel onResult={() => {}} selectedIndustry={selectedIndustry} selectedVerifications={selectedVerifications} selectedPermission={selectedPermission} />
            : (categoriesLoading
              ? <div className="py-10 text-center text-sm text-gray-400 font-inter">Loading categories…</div>
              : <ProductBulkPanel categories={categories} onResult={() => {}} selectedCategory={selectedProductSector} selectedService={activeProductService} selectedPermission={selectedPermission} />
            )
          }
        </Card>
      </div>
    </AuthLayout>
  );
};

export default CreateBatch;
