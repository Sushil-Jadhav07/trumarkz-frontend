import React, { useState, useEffect } from 'react';
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
  ArrowLeft, User, FileText, CheckCircle, XCircle, Clock,
  Download, QrCode, ExternalLink, RefreshCw, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  if (status === 'verified') return <Badge status="success">✓ Verified</Badge>;
  if (status === 'failed')   return <Badge status="error">✗ Failed</Badge>;
  return <Badge status="pending">Pending</Badge>;
};

export const RecordDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isSuperAdmin = role === 'super-admin' || role === 'super_admin';

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await verificationAPI.getUserVerification(id);
        setUser(data);
      } catch (err) {
        toast.error(getApiError(err, 'Failed to load user details'));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await verificationAPI.updateVerificationStatus(id, 'verified');
      setUser((u) => ({ ...u, verification_status: 'verified' }));
      toast.success('User verified successfully!');
      setShowRejectForm(false);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason for rejection'); return; }
    setActionLoading(true);
    try {
      await verificationAPI.updateVerificationStatus(id, 'failed', rejectReason.trim());
      setUser((u) => ({ ...u, verification_status: 'failed', verification_reason: rejectReason.trim() }));
      toast.success('Verification rejected.');
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update status'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateCert = async () => {
    if (user?.verification_status !== 'verified') {
      toast.error('Certificate can only be generated for verified users');
      return;
    }
    setCertLoading(true);
    try {
      const { data } = await verificationAPI.generateQRAndCertificate(id);
      setCertificate(data);
      toast.success('Certificate generated!');
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
          <p className="text-sm text-gray-400 font-inter">Loading record…</p>
        </div>
      </AuthLayout>
    );
  }

  if (!user) {
    return (
      <AuthLayout title="Record Detail">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={28} className="text-orange-400" />
          <p className="text-sm text-gray-500 font-inter">User not found</p>
          <Button variant="outline" onClick={() => navigate('/org/batch-status')} icon={ArrowLeft}>
            Back
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Record Detail">
      <div className="w-full mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/org/batch-status')}
          className="flex items-center gap-2 text-sm text-brand-blue font-inter mb-4 hover:underline"
        >
          <ArrowLeft size={16} /> Back to Batch
        </button>

        <PageHeader title={user.full_name} subtitle={`User ID: ${user.id}`} />

        {/* Profile Card */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-4 mb-5">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <User size={32} className="text-brand-blue" />
              </div>
            )}
            <div>
              <h2 className="font-sora font-bold text-lg text-brand-dark">{user.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={user.verification_status} />
                {user.verified_at && (
                  <span className="text-xs text-gray-400 font-inter">
                    {new Date(user.verified_at).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-inter">
            {[
              { label: 'Email',  value: user.email },
              { label: 'Phone',  value: user.phone_number },
              { label: 'DOB',    value: user.dob ? new Date(user.dob).toLocaleDateString('en-IN') : '—' },
              { label: 'Aadhar', value: user.aadhar_number || '—' },
              { label: 'PAN',    value: user.pan_number || '—' },
              { label: 'State',  value: user.state ? `${user.state}${user.pincode ? ' - ' + user.pincode : ''}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-medium text-brand-dark truncate">{value}</p>
              </div>
            ))}
          </div>

          {user.verification_reason && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs font-medium text-red-700 font-inter">
                Rejection reason: {user.verification_reason}
              </p>
            </div>
          )}
        </Card>

        {/* Documents */}
        {user.documents?.length > 0 && (
          <Card className="p-5 mb-4">
            <h3 className="font-sora font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <FileText size={16} className="text-brand-blue" />
              Documents ({user.documents.length})
            </h3>
            <div className="space-y-2">
              {user.documents.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-dark font-inter capitalize">
                        {doc.document_label.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400 font-inter">Version {doc.version}</p>
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

        {/* Certificate Section */}
        {user.verification_status === 'verified' && (
          <Card className="p-5 mb-4">
            <h3 className="font-sora font-semibold text-brand-dark mb-3 flex items-center gap-2">
              <QrCode size={16} className="text-green-600" />
              Verification Certificate
            </h3>
            {certificate ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs text-green-700 font-inter font-medium mb-2">Certificate ready!</p>
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
                {certLoading ? 'Generating…' : 'Generate QR & PDF Certificate'}
              </Button>
            )}
          </Card>
        )}

        {/* Admin Actions */}
        {isSuperAdmin && user.verification_status !== 'verified' && (
          <Card className="p-5 mb-4">
            <h3 className="font-sora font-semibold text-brand-dark mb-3">Admin Actions</h3>
            <div className="space-y-3">
              <Button
                variant="success"
                className="w-full"
                onClick={handleApprove}
                disabled={actionLoading}
                icon={CheckCircle}
              >
                {actionLoading ? 'Processing…' : '✓ Approve Verification'}
              </Button>

              {!showRejectForm ? (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowRejectForm(true)}
                  icon={XCircle}
                >
                  ✗ Reject Verification
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-inter
                               focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    rows={3}
                    placeholder="Reason for rejection (required)…"
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