import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { sdcAPI, getApiError } from '@/services/api';
import { ArrowLeft, Download, QrCode, RefreshCw, XCircle, FileText, Building2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const humanizeKey = (key) =>
  key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ReportView = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // this is the record's publicId, not its id — see /sdc/records/{public_id}
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setRecord(null);
    sdcAPI.getRecord(id)
      .then(({ data }) => setRecord(data))
      .catch((err) => toast.error(getApiError(err, 'Failed to load certificate')))
      .finally(() => setLoading(false));
  }, [id]);

  const credential = record?.credential || {};
  const subject = credential.credentialSubject;
  const title = subject?.name || subject?.title || subject?.fullName || 'Verification Certificate';
  const issuer = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer?.name || credential.issuer?.id;
  const issuanceDate = formatDate(credential.issuanceDate || credential.validFrom);
  const subjectEntries = subject
    ? Object.entries(subject).filter(([key, value]) => key !== 'id' && key !== 'type' && value != null && value !== '')
    : [];

  return (
    <AuthLayout title="Certificate">
      <div className="w-full mx-auto lg:max-w-none">
        <button
          onClick={() => navigate('/qr/reports')}
          className="flex items-center gap-2 text-sm text-brand-blue font-inter mb-4 hover:underline"
        >
          <ArrowLeft size={14} /> Back to Certificates
        </button>

        <PageHeader title={title} subtitle={`Certificate ID: ${id}`} />

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <RefreshCw size={24} className="animate-spin text-brand-blue" />
            <p className="font-inter text-sm text-gray-400">Loading certificate…</p>
          </div>
        ) : !record ? (
          <Card className="p-12 text-center">
            <XCircle size={28} className="text-red-300 mx-auto mb-3" />
            <p className="text-gray-400 font-inter text-sm">Certificate not found.</p>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 font-inter">Public ID</p>
                  <p className="font-mono text-xs text-brand-dark break-all">{record.public_id}</p>
                </div>
                <Badge status="success">Verified</Badge>
              </div>

              {(issuer || issuanceDate) && (
                <div className="border-t border-gray-100 pt-5 mb-5 grid grid-cols-2 gap-4">
                  {issuer && (
                    <div className="flex items-start gap-2.5">
                      <Building2 size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide">Issued By</p>
                        <p className="text-sm font-medium text-brand-dark font-inter truncate">{issuer}</p>
                      </div>
                    </div>
                  )}
                  {issuanceDate && (
                    <div className="flex items-start gap-2.5">
                      <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide">Issued On</p>
                        <p className="text-sm font-medium text-brand-dark font-inter">{issuanceDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {subjectEntries.length > 0 && (
                <div className="border-t border-gray-100 pt-5 mb-5">
                  <h3 className="font-sora font-semibold text-brand-dark mb-3 text-sm">Certificate Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {subjectEntries.map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-inter uppercase tracking-wide mb-0.5">{humanizeKey(key)}</p>
                        <p className="text-sm font-medium text-brand-dark font-inter break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {record.pdf && (
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
                    <FileText size={32} className="text-gray-300" />
                    <p className="font-inter text-sm text-gray-500 max-w-sm">
                      This certificate is hosted by Dhiway and can't be previewed inline — use the buttons below to
                      download the PDF or open the public verification page.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              {record.pdf && (
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  icon={Download}
                  onClick={() => window.open(record.pdf, '_blank', 'noopener,noreferrer')}
                >
                  Download PDF
                </Button>
              )}
              {record.verify && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  icon={QrCode}
                  onClick={() => window.open(record.verify, '_blank', 'noopener,noreferrer')}
                >
                  Verify Certificate
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
};

export default ReportView;
