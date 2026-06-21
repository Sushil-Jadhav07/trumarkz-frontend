import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { verificationAPI, getApiError } from '@/services/api';
import {
  Search, Package, RefreshCw, CheckCircle, XCircle, Clock,
  AlertTriangle, ArrowRight, Shield, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:  { label: 'Pending',  tone: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock       },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-600 border-red-200',         icon: XCircle     },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-inter ${meta.tone}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

const formatDate = (v) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return v; }
};

// ── Approve / Reject modal ─────────────────────────────────────────────────────
const ActionModal = ({ isOpen, onClose, product, action, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

  const isReject = action === 'rejected';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await verificationAPI.approveRejectWarranty(product.id, action, reason.trim());
      toast.success(`Warranty ${action} successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getApiError(err, `Failed to ${action} warranty`));
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={isReject ? 'Reject Warranty' : 'Approve Warranty'}
      size="sm"
    >
      <div className="space-y-4">
        {/* Product info */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-bg rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <Package size={15} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter truncate">{product.product_name || '—'}</p>
            <p className="text-xs text-gray-400 font-inter truncate">S/N: {product.serial_number || '—'}</p>
          </div>
        </div>

        {/* Confirmation message */}
        <div className={`flex items-start gap-3 p-3 rounded-xl ${isReject ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
          {isReject
            ? <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            : <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          }
          <p className={`text-xs font-inter leading-5 ${isReject ? 'text-red-700' : 'text-emerald-700'}`}>
            {isReject
              ? 'This will mark the warranty as rejected. The organisation will be notified.'
              : 'This will approve the warranty claim and mark it as valid.'}
          </p>
        </div>

        {/* Reason (optional) */}
        <div>
          <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">
            Reason <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add a note for the organisation…"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 font-inter text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium font-inter transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${isReject ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {submitting
              ? <><RefreshCw size={13} className="animate-spin" /> Processing…</>
              : isReject ? <><XCircle size={13} /> Reject</> : <><CheckCircle size={13} /> Approve</>
            }
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Summary bar ───────────────────────────────────────────────────────────────
const SummaryBar = ({ summary }) => {
  const items = [
    { label: 'Pending',  value: summary?.pending  ?? '—', tone: 'bg-amber-50 border-amber-200 text-amber-700',    dot: 'bg-amber-400' },
    { label: 'Approved', value: summary?.approved ?? '—', tone: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
    { label: 'Rejected', value: summary?.rejected ?? '—', tone: 'bg-red-50 border-red-200 text-red-600',          dot: 'bg-red-400' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {items.map((item) => (
        <div key={item.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${item.tone}`}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
          <div>
            <p className="font-sora font-bold text-2xl leading-none">{item.value}</p>
            <p className="font-inter text-xs font-medium mt-1 opacity-80">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Product row ────────────────────────────────────────────────────────────────
const ProductRow = ({ product, index, onAction }) => (
  <motion.tr
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.04 }}
    className="border-b border-blue-50 hover:bg-blue-50/30 transition-colors"
  >
    <td className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
          <Package size={14} className="text-brand-blue" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-dark font-inter truncate">{product.product_name || '—'}</p>
          <p className="text-xs text-gray-400 font-inter font-mono mt-0.5">{product.serial_number || '—'}</p>
        </div>
      </div>
    </td>
    <td className="px-5 py-3.5 text-xs text-gray-500 font-inter">{product.category || '—'}</td>
    <td className="px-5 py-3.5 text-xs text-gray-500 font-inter">{formatDate(product.purchase_date)}</td>
    <td className="px-5 py-3.5 text-xs text-gray-500 font-inter">{formatDate(product.warranty_start_date)}</td>
    <td className="px-5 py-3.5 text-xs text-gray-500 font-inter">{formatDate(product.warranty_end_date)}</td>
    <td className="px-5 py-3.5"><StatusBadge status={product.warranty_status || 'pending'} /></td>
    <td className="px-5 py-3.5">
      {(product.warranty_status === 'pending' || !product.warranty_status) && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAction(product, 'approved')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium font-inter hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onAction(product, 'rejected')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium font-inter hover:bg-red-100 transition-colors"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      )}
      {product.warranty_status === 'approved' && (
        <span className="text-xs text-gray-400 font-inter">—</span>
      )}
      {product.warranty_status === 'rejected' && product.reason && (
        <span className="text-xs text-gray-400 font-inter italic truncate max-w-[120px] block" title={product.reason}>
          {product.reason}
        </span>
      )}
    </td>
  </motion.tr>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
export const ProductWarrantyAdmin = () => {
  const [batchId, setBatchId] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, product: null, action: '' });

  const fetchWarranty = useCallback(async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const { data: resp } = await verificationAPI.getWarrantyStatus(id.trim());
      setData(resp);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load warranty batch'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setBatchId(inputVal.trim());
    fetchWarranty(inputVal.trim());
  };

  const refresh = () => fetchWarranty(batchId);

  const products = data?.products || [];
  const summary = data?.summary || null;

  const filtered = search.trim()
    ? products.filter((p) =>
        [p.product_name, p.serial_number, p.category]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  return (
    <AuthLayout title="Warranty Review">
      <PageHeader
        title="Product Warranty Review"
        subtitle="Approve or reject warranty claims submitted by organisations"
        action={
          batchId && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )
        }
      />

      {/* Batch ID search */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5 border border-blue-100 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield size={15} className="text-brand-blue" />
            </div>
            <div>
              <p className="font-semibold text-brand-dark font-inter text-sm">Load Warranty Batch</p>
              <p className="text-xs text-gray-400 font-inter">Enter the warranty batch ID to review its products</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Warranty batch ID…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                icon={Search}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              icon={ChevronRight}
              disabled={!inputVal.trim() || loading}
            >
              Load Batch
            </Button>
          </form>
        </Card>
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-center py-16 gap-3 text-brand-blue">
            <RefreshCw size={20} className="animate-spin" />
            <span className="font-inter text-sm">Loading warranty batch…</span>
          </motion.div>
        ) : data ? (
          <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Summary */}
            {summary && <SummaryBar summary={summary} />}

            {/* Search filter */}
            <div className="mb-4 max-w-sm">
              <Input
                placeholder="Search by product name or serial…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>

            {/* Table */}
            <Card className="overflow-hidden border border-blue-100 p-0">
              {filtered.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="font-inter text-sm text-gray-400">No products found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] font-inter">
                    <thead>
                      <tr className="border-b border-blue-100 bg-blue-50/80">
                        {['Product', 'Category', 'Purchase Date', 'Warranty Start', 'Warranty End', 'Status', 'Action'].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-blue/70">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((product, i) => (
                        <ProductRow
                          key={product.id || i}
                          product={product}
                          index={i}
                          onAction={(p, action) => setActionModal({ open: true, product: p, action })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        ) : batchId ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <p className="font-sora font-semibold text-brand-dark">No data found</p>
            <p className="text-sm text-gray-400 font-inter mt-1">Check the batch ID and try again</p>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Package size={24} className="text-brand-blue" />
            </div>
            <p className="font-sora font-semibold text-brand-dark">Enter a warranty batch ID</p>
            <p className="text-sm text-gray-400 font-inter mt-1">Load a batch above to review and action warranty claims</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action modal */}
      <ActionModal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ open: false, product: null, action: '' })}
        product={actionModal.product}
        action={actionModal.action}
        onSuccess={refresh}
      />
    </AuthLayout>
  );
};

export default ProductWarrantyAdmin;
