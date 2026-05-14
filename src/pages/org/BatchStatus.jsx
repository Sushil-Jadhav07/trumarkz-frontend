import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { verificationAPI, getApiError } from '@/services/api';
import { RefreshCw, Eye, CheckCircle, Clock, XCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '',                    label: 'All' },
  { value: 'pending_verification',label: 'Pending' },
  { value: 'verified',            label: 'Verified' },
  { value: 'failed',              label: 'Failed' },
];

const statusBadge = (status) => {
  if (status === 'verified')             return { variant: 'success', label: 'Verified',  icon: CheckCircle };
  if (status === 'failed')               return { variant: 'error',   label: 'Failed',    icon: XCircle };
  return                                        { variant: 'pending', label: 'Pending',   icon: Clock };
};

const PAGE_SIZE = 20;

export const BatchStatus = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: result } = await verificationAPI.getAllVerifications({
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to fetch verifications'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const progress = data && data.total > 0
    ? Math.round(((data.verified + data.failed) / data.total) * 100)
    : 0;

  return (
    <AuthLayout title="Batch Status">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader
          title="Verification Batch Status"
          subtitle="Monitor all user verifications across your batches"
          action={
            <button
              onClick={() => fetchData(true)}
              className={`flex items-center gap-2 text-sm text-gray-500 font-inter hover:text-brand-blue transition-colors ${refreshing ? 'pointer-events-none' : ''}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total',   value: data.total,   color: 'bg-brand-blue' },
              { label: 'Pending', value: data.pending,  color: 'bg-orange-400' },
              { label: 'Verified',value: data.verified, color: 'bg-green-500' },
              { label: 'Failed',  value: data.failed,   color: 'bg-red-500' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`${stat.color} text-white rounded-xl p-4 text-center`}
              >
                <p className="font-sora font-bold text-2xl">{stat.value}</p>
                <p className="text-xs opacity-80 font-inter">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Progress */}
        {data && (
          <Card className="p-5 mb-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-sora font-semibold text-brand-dark text-sm">Overall Progress</h3>
              <span className="text-xs text-gray-400 font-inter">{progress}% complete</span>
            </div>
            <ProgressBar progress={progress} color="blue" height="h-3" />
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-inter transition-all
                  ${statusFilter === opt.value
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <Card className="p-0 overflow-hidden mb-4">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-brand-blue" />
              <p className="text-sm text-gray-400 font-inter">Loading verifications…</p>
            </div>
          ) : !data?.users?.length ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400 font-inter">No records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-inter">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Name</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium hidden md:table-cell">Docs</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Status</th>
                    <th className="text-right p-4 text-xs text-gray-500 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user, i) => {
                    const sb = statusBadge(user.verification_status);
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.photo_url ? (
                              <img
                                src={user.photo_url}
                                alt={user.full_name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-brand-blue">
                                  {user.full_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-brand-dark truncate">{user.full_name}</p>
                              <p className="text-xs text-gray-400 sm:hidden truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 hidden sm:table-cell">{user.email}</td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-gray-500">{user.documents?.length || 0}</span>
                        </td>
                        <td className="p-4">
                          <Badge status={sb.variant}>{sb.label}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => navigate(`/org/record/${user.id}`)}
                            className="flex items-center gap-1 text-xs text-brand-blue hover:underline ml-auto"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400 font-inter">
              Page {page + 1} of {totalPages} · {data.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                icon={ChevronLeft}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          onClick={() => navigate('/org/create-batch')}
          icon={RefreshCw}
        >
          New Batch Upload
        </Button>
      </div>
    </AuthLayout>
  );
};

export default BatchStatus;