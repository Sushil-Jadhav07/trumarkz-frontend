import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SDC_DUMMY_BATCHES } from '@/data/mockData';
import {
  Search, ShieldCheck, Users, Package, User,
  ChevronRight, CheckCircle, Clock, XCircle, ArrowLeft, FileText, QrCode, Eye, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const SAFE_BATCHES = Array.isArray(SDC_DUMMY_BATCHES) ? SDC_DUMMY_BATCHES : [];

const statusBadge = (status) => {
  if (status === 'verified') return { variant: 'success', label: 'Verified' };
  if (status === 'failed') return { variant: 'error', label: 'Failed' };
  if (status === 'pending_verification') return { variant: 'pending', label: 'Pending' };
  return { variant: 'default', label: status || 'Unknown' };
};

const entityIcon = (entityType) => {
  if (entityType === 'product') return Package;
  if (entityType === 'individual') return User;
  return Users;
};

const entityLabel = (entityType) => {
  if (entityType === 'product') return 'Product';
  if (entityType === 'individual') return 'Individual';
  return 'Human / KYC';
};

const isProduct = (record) =>
  !!record?.product_name || !!record?.category_name || !!record?.custom_fields;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const batchStats = (records = []) => ({
  total: records.length,
  verified: records.filter((r) => r.verification_status === 'verified').length,
  pending: records.filter((r) => r.verification_status === 'pending_verification').length,
  failed: records.filter((r) => r.verification_status === 'failed').length,
});

const ALL_INDUSTRIES = [
  'All Industries',
  'Transport & Logistics',
  'Healthcare',
  'Education',
  'Electronics & Appliances',
  'Luxury Products',
  'Freelance / Gig',
  'Technology',
  'Manufacturing',
  'Agriculture',
  'Insurance',
];

const Detail = ({ label, value, mono }) => (
  <div>
    <p className="text-xs text-gray-400 font-inter mb-0.5 capitalize">{label}</p>
    <p className={`text-sm text-brand-dark font-inter ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
      {value || '-'}
    </p>
  </div>
);

const RecordCertModal = ({ record, batchIndustry, onClose }) => {
  if (!record) return null;
  const { variant, label } = statusBadge(record.verification_status);
  const isProductRecord = isProduct(record);

  return (
    <Modal isOpen={!!record} onClose={onClose} title="Record Certificate" size="lg">
      <div className="space-y-5">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          variant === 'success' ? 'bg-green-50 border-green-100' :
          variant === 'error' ? 'bg-red-50 border-red-100' :
          'bg-orange-50 border-orange-100'
        }`}>
          <Badge status={variant}>{label}</Badge>
          {record.verified_at && (
            <span className="text-xs text-gray-500 font-inter">Verified on {formatDate(record.verified_at)}</span>
          )}
          {record.verification_reason && (
            <span className="text-xs text-red-600 font-inter ml-auto">{record.verification_reason}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isProductRecord ? (
            <>
              <Detail label="Product Name" value={record.product_name} />
              <Detail label="Category" value={record.category_name} />
              {Object.entries(record.custom_fields || {}).map(([k, v]) => (
                <Detail key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
              ))}
            </>
          ) : (
            <>
              <Detail label="Full Name" value={record.full_name} />
              <Detail label="Email" value={record.email} />
              <Detail label="Phone" value={record.phone_number} />
              <Detail label="Date of Birth" value={formatDate(record.dob)} />
              {record.aadhar_number && <Detail label="Aadhaar" value={record.aadhar_number} />}
              {record.pan_number && <Detail label="PAN" value={record.pan_number} />}
            </>
          )}
          <Detail label="Industry" value={batchIndustry} />
          <Detail label="Record ID" value={record.id} mono />
        </div>

        {record.documents?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-inter">Documents</p>
            <div className="space-y-2">
              {record.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 font-inter">{doc.document_label || `Document ${i + 1}`}</span>
                  {doc.document_url && (
                    <a href={doc.document_url} target="_blank" rel="noreferrer" className="text-brand-blue text-xs font-inter hover:underline flex items-center gap-1">
                      <Eye size={12} /> View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {record.verification_status === 'verified' && (
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => toast('QR generation coming soon via live API')}>
              <QrCode size={14} /> View QR Certificate
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast('PDF download coming soon via live API')}>
              <FileText size={14} /> Download PDF
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

const BatchDetail = ({ batch, onBack }) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (batch.records || []).filter((r) =>
      [r.full_name, r.product_name, r.email, r.id].some((v) => v?.toLowerCase().includes(q))
    );
  }, [batch.records, search]);

  const stats = batchStats(batch.records || []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-dark transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-brand-dark font-sora">{batch.org_name}</h2>
          <p className="text-xs text-gray-500 font-inter font-mono">{batch.batch_id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge status="default">{entityLabel(batch.entity_type)}</Badge>
          <span className="text-xs text-gray-400 font-inter">{batch.industry}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-brand-dark' },
          { label: 'Verified', value: stats.verified, color: 'text-green-600' },
          { label: 'Pending', value: stats.pending, color: 'text-orange-500' },
          { label: 'Failed', value: stats.failed, color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold font-sora ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-inter mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search records by name, email, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Name / Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Email / ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-inter">Verified At</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((record) => {
                const { variant, label } = statusBadge(record.verification_status);
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-dark font-inter max-w-[260px] truncate">{record.full_name || record.product_name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-inter max-w-[240px] truncate">{record.email || record.id}</td>
                    <td className="px-4 py-3"><Badge status={variant}>{label}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-inter">{formatDate(record.verified_at)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                        <Eye size={14} /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 font-inter">No records match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordCertModal record={selectedRecord} batchIndustry={batch.industry} onClose={() => setSelectedRecord(null)} />
    </motion.div>
  );
};

const BatchCard = ({ batch, onClick }) => {
  const stats = batchStats(batch.records || []);
  const pct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
  const EntityIcon = entityIcon(batch.entity_type);

  return (
    <Card hover className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <EntityIcon size={18} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{batch.org_name}</p>
            <p className="text-xs text-gray-400 font-mono">{String(batch.batch_id || '').slice(0, 20)}...</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-inter">{entityLabel(batch.entity_type)}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue font-inter">{batch.industry}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 font-inter mb-2">
        <span>{stats.total} records</span>
        <span className="text-green-600 font-medium">{pct}% verified</span>
      </div>
      <ProgressBar progress={pct} showLabel={false} height="h-2" />

      <div className="flex items-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={11} /> {stats.verified}</span>
        <span className="flex items-center gap-1 text-xs text-orange-500"><Clock size={11} /> {stats.pending}</span>
        {stats.failed > 0 && <span className="flex items-center gap-1 text-xs text-red-500"><XCircle size={11} /> {stats.failed}</span>}
        <span className="ml-auto text-xs text-gray-400">{formatDate(batch.created_at)}</span>
      </div>
    </Card>
  );
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'organization', label: 'Human' },
  { id: 'individual', label: 'Individuals' },
  { id: 'product', label: 'Products' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const FilterDropdown = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="h-[50px] min-w-[170px] px-3 py-2 border-2 border-brand-gray rounded-xl text-sm font-inter text-gray-700 bg-white flex items-center justify-between cursor-pointer"
      >
        <span>{selected?.label}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-md py-1">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm font-inter cursor-pointer hover:bg-gray-50 ${
                opt.value === value ? 'text-brand-blue font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SDCVerification = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState(null);

  const filtered = useMemo(() => {
    let data = SAFE_BATCHES;

    if (activeTab === 'organization') data = data.filter((b) => b.entity_type === 'human');
    if (activeTab === 'individual') data = data.filter((b) => b.entity_type === 'individual');
    if (activeTab === 'product') data = data.filter((b) => b.entity_type === 'product');

    if (industryFilter !== 'All Industries') data = data.filter((b) => b.industry === industryFilter);

    if (statusFilter !== 'all') {
      const statusKey = statusFilter === 'pending' ? 'pending_verification' : statusFilter;
      data = data.filter((b) => (b.records || []).some((r) => r.verification_status === statusKey));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((b) =>
        String(b.org_name || '').toLowerCase().includes(q) ||
        String(b.batch_id || '').toLowerCase().includes(q) ||
        String(b.industry || '').toLowerCase().includes(q) ||
        (b.records || []).some((r) => [r.full_name, r.product_name, r.email].some((v) => v?.toLowerCase().includes(q)))
      );
    }

    return data;
  }, [activeTab, search, industryFilter, statusFilter]);

  const totalRecords = SAFE_BATCHES.reduce((s, b) => s + (Array.isArray(b.records) ? b.records.length : 0), 0);
  const totalVerified = SAFE_BATCHES.reduce((s, b) => s + (Array.isArray(b.records) ? b.records.filter((r) => r.verification_status === 'verified').length : 0), 0);
  const totalPending = SAFE_BATCHES.reduce((s, b) => s + (Array.isArray(b.records) ? b.records.filter((r) => r.verification_status === 'pending_verification').length : 0), 0);
  const totalBatches = SAFE_BATCHES.length;

  if (selectedBatch) {
    return (
      <AuthLayout title="SDC Verification">
        <div className="w-full px-2 sm:px-4 lg:px-1">
          <BatchDetail batch={selectedBatch} onBack={() => setSelectedBatch(null)} />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="SDC Verification">
      <div className="w-full px-2 sm:px-4 lg:px-1">
        <PageHeader title="SDC Verification" subtitle="Unified view of all organization and individual verification batches" />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Batches', value: totalBatches, color: 'text-brand-dark', bg: 'bg-gray-50' },
            { label: 'Total Records', value: totalRecords, color: 'text-brand-blue', bg: 'bg-blue-50' },
            { label: 'Verified', value: totalVerified, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending Review', value: totalPending, color: 'text-orange-500', bg: 'bg-orange-50' },
          ].map((s) => (
            <Card key={s.label} className={`p-4 ${s.bg}`}>
              <p className={`text-3xl font-bold font-sora ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-inter mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium font-inter transition-all ${
                activeTab === tab.id ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="p-4 mb-6 border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <Input
                placeholder="Search by org, batch, name, industry..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>

            <FilterDropdown
              value={industryFilter}
              onChange={setIndustryFilter}
              options={ALL_INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
            />

            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTERS}
            />

            {(search || industryFilter !== 'All Industries' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setIndustryFilter('All Industries'); setStatusFilter('all'); }}
                className="text-xs text-gray-500 hover:text-brand-dark font-inter underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>

        <p className="text-xs text-gray-400 font-inter mb-4">Showing {filtered.length} batch{filtered.length !== 1 ? 'es' : ''}</p>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-inter text-sm">No batches match your filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((batch, i) => (
                <motion.div
                  key={batch.batch_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <BatchCard batch={batch} onClick={() => setSelectedBatch(batch)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default SDCVerification;
