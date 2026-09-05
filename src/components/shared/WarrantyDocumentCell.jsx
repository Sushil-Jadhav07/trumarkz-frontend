import React, { useEffect, useRef, useState } from 'react';
import { Eye, Upload, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { verificationAPI, getApiError } from '@/services/api';

// Per-BatchUser document control — Upload / View / Replace / Delete, keyed
// strictly by batchUserId (never name or row position, since duplicate
// names are expected). Two independent slots share this same component:
// "Warranty Report" (custom_fields.warrenty_report) and "Product Details"
// (custom_fields.product_details) — each is its own document destination;
// uploading one never touches the other. `label` selects which slot this
// instance manages (the exact document_label sent to
// POST /products/{batch_user_id}/warranty-document). `url` is the current
// document URL for that slot as known by the parent; once this cell uploads
// its own file, it holds that response locally (with the document_id needed
// to enable Delete) until the parent's `url` prop actually changes — which
// happens after `onDeleted` triggers a parent refetch.
export const WarrantyDocumentCell = ({ batchId, batchUserId, label = 'Warranty Report', url: propUrl, fileName: propFileName, onDeleted }) => {
  const [local, setLocal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef(null);
  const prevPropUrl = useRef(propUrl);

  useEffect(() => {
    if (propUrl !== prevPropUrl.current) {
      prevPropUrl.current = propUrl;
      setLocal(null);
    }
  }, [propUrl]);

  const doc = local || (propUrl ? { documentId: null, url: propUrl, fileName: propFileName } : null);

  const handleFile = async (file) => {
    if (!file || !batchUserId) return;
    setUploading(true);
    try {
      const { data: resp } = await verificationAPI.uploadWarrantyDocument(batchUserId, file, label);
      setLocal({
        documentId: resp?.document_id || null,
        url: resp?.document_url || null,
        fileName: resp?.file_name || file.name,
      });
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(getApiError(err, `Failed to upload ${label.toLowerCase()}`));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!doc?.documentId) return;
    setDeleting(true);
    try {
      await verificationAPI.deleteBatchUserDocument(batchId, batchUserId, doc.documentId);
      toast.success(`${label} deleted`);
      setConfirming(false);
      setLocal(null);
      await onDeleted?.();
    } catch (err) {
      toast.error(getApiError(err, `Failed to delete ${label.toLowerCase()}`));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        ref={inputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          handleFile(file);
        }}
      />
      {doc?.url ? (
        confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">Delete?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              {deleting ? '…' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-[11px] font-semibold text-gray-500 hover:underline"
            >
              No
            </button>
          </div>
        ) : (
          <>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              title={doc.fileName || label}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline"
            >
              <Eye size={12} /> View
            </a>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              title="Replace document"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-brand-dark disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
            </button>
            <button
              type="button"
              onClick={() => doc.documentId && setConfirming(true)}
              disabled={!doc.documentId}
              title={doc.documentId ? 'Delete document' : 'Refresh to enable delete for this document'}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
            </button>
          </>
        )
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-500 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:opacity-50"
        >
          {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
      )}
    </div>
  );
};

export default WarrantyDocumentCell;
