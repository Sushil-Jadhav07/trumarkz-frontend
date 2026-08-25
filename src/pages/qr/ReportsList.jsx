import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { sdcAPI, getApiError } from '@/services/api';
import { Search, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'issued', label: 'Issued' },
  { value: 'draft', label: 'Draft' },
];

export const ReportsList = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // anchorTime is Dhiway's source of truth for issued-vs-draft: set = issued, null = still a draft.
  const fetchRecords = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await sdcAPI.getRecords({ active: 1, pageSize: 100 });
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verification reports'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter((r) => {
    const issued = !!r.anchorTime && !r.revoked;
    const matchesFilter = filter === 'all' || (filter === 'issued' ? issued : !issued);
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      (r.recipients || []).some((email) => email?.toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  return (
    <AuthLayout title="Certificates">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Certificates"
          subtitle="View and download your organization's signed digital certificates"
          action={
            <button
              onClick={() => fetchRecords(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-inter text-sm font-medium text-brand-dark transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          }
        />

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium font-inter whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <RefreshCw size={24} className="animate-spin text-brand-blue" />
            <p className="font-inter text-sm text-gray-400">Loading reports…</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-inter text-sm">
              {records.length === 0 ? 'No verification reports yet.' : 'No reports match your search.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((report, i) => {
              const issued = !!report.anchorTime && !report.revoked;
              return (
                <motion.div
                  key={report.publicId || report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`p-4 transition-shadow ${issued ? 'cursor-pointer hover:shadow-md' : 'opacity-70'}`}
                    onClick={issued ? () => navigate(`/qr/report/${report.publicId}`) : undefined}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-brand-blue/10 rounded-lg shrink-0">
                          <FileText size={18} className="text-brand-blue" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-brand-dark font-inter text-sm truncate">
                            {report.title || 'Certificate'}
                          </p>
                          <p className="text-xs text-gray-500 font-inter truncate">
                            {(report.recipients || []).join(', ') || '—'} · {formatDate(report.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge status={issued ? 'success' : 'pending'}>{issued ? 'Verified' : 'Draft'}</Badge>
                        {issued && (
                          <span className="flex items-center gap-1 text-sm font-medium text-brand-blue font-inter">
                            View <ArrowRight size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default ReportsList;
