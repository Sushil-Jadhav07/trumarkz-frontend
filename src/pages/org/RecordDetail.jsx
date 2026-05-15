import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { verificationAPI, getApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Package,
  QrCode,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  if (status === 'verified') return <Badge status="success">Verified</Badge>;
  if (status === 'failed') return <Badge status="error">Failed</Badge>;
  return <Badge status="pending">Pending</Badge>;
};

const isProductRecord = (record) =>
  record?.entity_type === 'product' ||
  !!record?.product_name ||
  !!record?.category_name ||
  !!record?.custom_fields;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN');
};

const readable = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value).replace(/_/g, ' ');
};

export const RecordDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role } = useAuth();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isSuperAdmin = role === 'super-admin' || role === 'super_admin';

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchRecord = async () => {
      setLoading(true);
      try {
        const { data } = await verificationAPI.getUserVerification(id);
        if (mounted) setRecord(data);
      } catch (err) {
        toast.error(getApiError(err, 'Failed to load record details'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRecord();
    return () => { mounted = false; };
  }, [id]);

  const updateStatus = async (status, reason = null) => {
    setActionLoading(true);
    try {
      await verificationAPI.updateVerificationStatus(id, status, reason);
      setRecord((current) => ({
        ...current,
        verification_status: status,
        verification_reason: reason,
      }));
      setShowRejectForm(false);
      setRejectReason('');
      toast.success(status === 'verified' ? 'Record verified successfully.' : 'Record rejected.');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    updateStatus('failed', rejectReason.trim());
  };

  const handleGenerateCert = async () => {
    if (record?.verification_status !== 'verified') {
      toast.error('Certificate can only be generated for verified records');
      return;
    }
    setCertLoading(true);
    try {
      const { data } = await verificationAPI.generateQRAndCertificate(id);
      setCertificate(data);
      toast.success('Certificate generated.');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to generate certificate'));
    } finally {
      setCertLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Record Detail">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw size={28} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading record...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!record) {
    return (
      <AuthLayout title="Record Detail">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={28} className="text-orange-400" />
          <p className="text-sm text-gray-500 font-inter">Record not found</p>
          <Button variant="outline" onClick={() => navigate('/org/batch-status')} icon={ArrowLeft}>
            Back
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const productRecord = isProductRecord(record);
  const recordTitle = record.product_name || record.full_name || record.email || record.id;
  const recordTypeLabel = productRecord ? 'Product' : 'Human';
  const customFields = record.custom_fields && typeof record.custom_fields === 'object'
    ? Object.entries(record.custom_fields).filter(([, value]) => value !== null && value !== undefined && value !== '')
    : [];
  const detailRows = productRecord
    ? [
        { label: 'Category', value: record.category_name || record.category_id },
        { label: 'Warranty', value: record.warranty_status || record.warranty_support || 'not_applicable' },
        { label: 'Batch', value: record.batch_id },
        { label: 'Created', value: formatDate(record.created_at) },
      ]
    : [
        { label: 'Email', value: record.email },
        { label: 'Phone', value: record.phone_number },
        { label: 'DOB', value: formatDate(record.dob) },
        { label: 'Aadhar', value: record.aadhar_number },
        { label: 'PAN', value: record.pan_number },
        { label: 'State', value: record.state ? `${record.state}${record.pincode ? ` - ${record.pincode}` : ''}` : null },
      ];

  return (
    <AuthLayout title="Record Detail">
      <div className="w-full mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/org/batch-status')}
          className="flex items-center gap-2 text-sm text-brand-blue font-inter mb-4 hover:underline"
        >
          <ArrowLeft size={16} /> Back to Batch
        </button>

        <PageHeader title={recordTitle} subtitle={`${recordTypeLabel} ID: ${record.id}`} />

        <Card className="p-6 mb-4">
          <div className="flex items-center gap-4 mb-5">
            {record.photo_url ? (
              <img
                src={record.photo_url}
                alt={recordTitle}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center">
                {productRecord ? <Package size={32} className="text-brand-blue" /> : <User size={32} className="text-brand-blue" />}
              </div>
            )}
            <div>
              <h2 className="font-sora font-bold text-lg text-brand-dark">{recordTitle}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge status="default">{recordTypeLabel}</Badge>
                <StatusBadge status={record.verification_status} />
                {record.verified_at && (
                  <span className="text-xs text-gray-400 font-inter">{formatDate(record.verified_at)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-inter">
            {detailRows.map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-medium text-brand-dark truncate capitalize">{readable(value)}</p>
              </div>
            ))}
          </div>

          {productRecord && customFields.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 font-inter uppercase tracking-wider mb-2">Custom Fields</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-inter">
                {customFields.map(([key, value]) => (
                  <div key={key} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-brand-blue mb-0.5 capitalize">{readable(key)}</p>
                    <p className="font-medium text-brand-dark truncate">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.verification_reason && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs font-medium text-red-700 font-inter">
                Rejection reason: {record.verification_reason}
              </p>
            </div>
          )}
        </Card>

        {record.documents?.length > 0 && (
          <Card className="p-5 mb-4">
            <h3 className="font-sora font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <FileText size={16} className="text-brand-blue" />
              Documents ({record.documents.length})
            </h3>
            <div className="space-y-2">
              {record.documents.map((doc, i) => (
                <motion.div
                  key={doc.id || `${doc.document_label}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-dark font-inter capitalize">
                        {readable(doc.document_label)}
                      </p>
                      <p className="text-xs text-gray-400 font-inter">Version {doc.version || 1}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={doc.verification_status} />
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:text-blue-700 transition-colors"
                      title="View document"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {record.verification_status === 'verified' && (
          <Card className="p-5 mb-4">
            <h3 className="font-sora font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <QrCode size={16} className="text-green-600" />
              Verification Certificate
            </h3>
            {certificate ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs text-green-700 font-inter font-medium mb-2">Certificate ready</p>
                  <a
                    href={certificate.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-blue hover:underline font-inter"
                  >
                    <Download size={14} /> Download PDF Certificate
                  </a>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 font-inter break-all">
                  QR Verify URL: {certificate.qr_code_data}
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateCert}
                disabled={certLoading}
                icon={certLoading ? RefreshCw : QrCode}
              >
                {certLoading ? 'Generating...' : 'Generate QR & PDF Certificate'}
              </Button>
            )}
          </Card>
        )}

        {isSuperAdmin && record.verification_status !== 'verified' && (
          <Card className="p-5 mb-4">
            <h3 className="font-sora font-semibold text-brand-dark mb-3">Admin Actions</h3>
            <div className="space-y-3">
              <Button
                variant="success"
                className="w-full"
                onClick={() => updateStatus('verified')}
                disabled={actionLoading}
                icon={CheckCircle}
              >
                {actionLoading ? 'Processing...' : 'Approve Verification'}
              </Button>

              {!showRejectForm ? (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowRejectForm(true)}
                  icon={XCircle}
                >
                  Reject Verification
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    rows={3}
                    placeholder="Reason for rejection (required)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" className="flex-1" onClick={handleReject} disabled={actionLoading}>
                      Confirm Reject
                    </Button>
                    <Button variant="outline" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default RecordDetail;
