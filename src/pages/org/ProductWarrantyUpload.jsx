import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { WarrantyDocumentCell } from '@/components/shared/WarrantyDocumentCell';
import { loadWarrantyCertificates } from '@/utils/warrantyCertificates';
import { verificationAPI, sdcAPI, getApiError } from '@/services/api';
import { Clock, CheckCircle, XCircle, RefreshCw, Package, Search, ArrowLeft, Download } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:  { label: 'Pending',  tone: 'bg-amber-50 text-amber-700 border-amber-200',      icon: Clock       },
  approved: { label: 'Approved', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  rejected: { label: 'Rejected', tone: 'bg-red-50 text-red-600 border-red-200',            icon: XCircle     },
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

// ── Summary tiles ──────────────────────────────────────────────────────────────
const SummaryTiles = ({ summary }) => {
  const tiles = [
    { label: 'Pending',  value: summary?.pending  ?? 0, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Approved', value: summary?.approved ?? 0, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Rejected', value: summary?.rejected ?? 0, cls: 'bg-red-50 border-red-200 text-red-600' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {tiles.map((t) => (
        <div key={t.label} className={`rounded-2xl border p-4 ${t.cls}`}>
          <p className="font-sora font-bold text-2xl leading-none">{t.value}</p>
          <p className="font-inter text-xs font-medium mt-1 opacity-80">{t.label}</p>
        </div>
      ))}
    </div>
  );
};


// ── Status viewer ──────────────────────────────────────────────────────────────
const StatusViewer = ({ batchId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // SDC certificate lookup, keyed by product/batch_user id — matched to
  // products by serial number identity, never array position (see
  // loadWarrantyCertificates).
  const [sdcByProductId, setSdcByProductId] = useState({});
  const [certsLoading, setCertsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const { data: resp } = await verificationAPI.getWarrantyStatus(batchId);
      setData(resp);
      setCertsLoading(true);
      try {
        const { sdcByProductId: byId } = await loadWarrantyCertificates(resp);
        setSdcByProductId(byId);
      } finally {
        setCertsLoading(false);
      }
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load warranty status'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDownloadWarrantyCertificate = async (publicId) => {
    setDownloadingId(publicId);
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    try {
      const { data: rec } = await sdcAPI.getRecord(publicId);
      if (rec?.pdf) {
        if (win) win.location.href = rec.pdf;
      } else {
        win?.close();
        toast.error('No PDF link on this certificate yet');
      }
    } catch (err) {
      win?.close();
      toast.error(getApiError(err, 'Failed to fetch certificate'));
    } finally {
      setDownloadingId(null);
    }
  };

  const products = data?.products || [];

  // The backend's own `summary` counts can go stale/zero on older batches —
  // when its total doesn't add up to the actual product count, derive the
  // counts from the products themselves instead of trusting it.
  const derivedSummary = products.reduce((acc, p) => {
    const status = p.warranty_status || 'approved';
    if (status === 'pending') acc.pending += 1;
    else if (status === 'rejected') acc.rejected += 1;
    else acc.approved += 1;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 });
  const rawSummary = data?.summary || null;
  const summaryIsConsistent = rawSummary &&
    Number(rawSummary.pending ?? 0) + Number(rawSummary.approved ?? 0) + Number(rawSummary.rejected ?? 0) === products.length;
  const summary = summaryIsConsistent ? rawSummary : derivedSummary;

  const filtered = search.trim()
    ? products.filter((p) =>
        [p.product_name, p.serial_number]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-dark font-inter">Warranty Status</p>
          <p className="text-xs text-gray-400 font-inter font-mono mt-0.5">{batchId}</p>
        </div>
        <button
          type="button"
          onClick={fetch}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-brand-blue">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm font-inter">Loading status…</span>
        </div>
      ) : (
        <>
          {summary && <SummaryTiles summary={summary} />}

          <div className="max-w-sm mb-4">
            <Input
              placeholder="Search product or serial…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <Card className="overflow-hidden border border-blue-100 p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400 font-inter">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] font-inter">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50/80">
                      {['Product', 'Serial Number', 'Warranty Start', 'Warranty End', 'Status', 'Certificate', 'Reason', 'Warranty Report', 'Product Details'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-blue/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product, i) => {
                      const batchUserId = product.product_id || product.id;
                      const warrantyReportUrl = product.custom_fields?.warrenty_report || product.custom_fields?.warranty_report || null;
                      const productDetailsUrl = product.custom_fields?.product_details || null;
                      const sdcMatch = batchUserId ? sdcByProductId[batchUserId] : null;
                      return (
                        <motion.tr
                          key={batchUserId || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-blue-50 hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                                <Package size={13} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-brand-dark truncate">{product.product_name || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{product.serial_number || '—'}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(product.warranty_start_date)}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(product.warranty_end_date)}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={product.warranty_status || 'approved'} /></td>
                          <td className="px-5 py-3.5">
                            {certsLoading ? (
                              <RefreshCw size={13} className="animate-spin text-gray-300" />
                            ) : sdcMatch ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadWarrantyCertificate(sdcMatch.publicId)}
                                disabled={downloadingId === sdcMatch.publicId}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline disabled:opacity-50"
                              >
                                {downloadingId === sdcMatch.publicId
                                  ? <RefreshCw size={12} className="animate-spin" />
                                  : <Download size={12} />}
                                Download
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-400 font-inter max-w-[160px]">
                            <span className="line-clamp-2">{product.warranty_reason || '—'}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <WarrantyDocumentCell
                              batchId={batchId}
                              batchUserId={batchUserId}
                              label="Warranty Report"
                              url={warrantyReportUrl}
                              onDeleted={fetch}
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            {/* Independent slot — never overwritten or cleared by
                                uploading/replacing/deleting the Warranty Report. */}
                            <WarrantyDocumentCell
                              batchId={batchId}
                              batchUserId={batchUserId}
                              label="Product Details"
                              url={productDetailsUrl}
                              onDeleted={fetch}
                            />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export const ProductWarrantyUpload = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batch_id');

  return (
    <AuthLayout title="Product Warranty">
      <div className="w-full px-2 sm:px-4 lg:px-1">
        <PageHeader
          title="Product Warranty"
          subtitle="Track warranty approval status for your products"
          action={
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/org/batch-status')}>
              Back to Batches
            </Button>
          }
        />

        {batchId ? (
          <StatusViewer batchId={batchId} />
        ) : (
          <Card className="p-12 text-center">
            <Package size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-inter text-sm">
              No batch selected. Open this page from a batch's certificate preview to view its warranty status.
            </p>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default ProductWarrantyUpload;
