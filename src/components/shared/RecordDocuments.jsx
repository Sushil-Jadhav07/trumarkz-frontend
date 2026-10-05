import React, { useEffect, useState } from 'react';
import { Download, Eye, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { verificationAPI, getApiError, triggerBlobDownload } from '@/services/api';
import { fetchDocumentFile, getRecordDocuments } from '@/utils/recordDocuments';

const DocumentRow = ({ document, index }) => {
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const urls = verificationAPI.getDocumentViewCandidates(document);
  const [url, fallbackUrl] = urls;
  const viewUrl = preview?.viewUrl || url;
  const label = String(document.document_label || `Document ${index + 1}`).replace(/_/g, ' ');
  const filename = document.file_name || document.filename;
  const isImage = preview?.blob.type.startsWith('image/');
  const isPdf = preview?.blob.type === 'application/pdf';

  useEffect(() => {
    const controller = new AbortController();
    let blobUrl;
    setPreview(null);
    setPreviewError(false);
    setPreviewLoading(!!url);
    if (url) {
      fetchDocumentFile(urls, fetch, controller.signal)
        .then(({ blob, viewUrl: workingUrl }) => {
          if (controller.signal.aborted) return;
          blobUrl = URL.createObjectURL(blob);
          setPreview({ blob, url: blobUrl, viewUrl: workingUrl });
        })
        .catch(() => { if (!controller.signal.aborted) setPreviewError(true); })
        .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false); });
    }
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url, fallbackUrl]);

  const download = async () => {
    setDownloading(true);
    try {
      let blob = preview?.blob;
      if (!blob) {
        ({ blob } = await fetchDocumentFile(urls, fetch));
      }
      const extension = blob.type === 'application/pdf' ? '.pdf'
        : blob.type.startsWith('image/') ? `.${blob.type.split('/')[1].replace('jpeg', 'jpg')}` : '';
      triggerBlobDownload(blob, filename || `${document.document_label || `document-${index + 1}`}${extension}`);
    } catch {
      toast.error('Could not download this document. Use View to open it and download from the viewer.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50/60 p-3">
        {url && isImage ? (
          <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0" title="View full-size document">
            <img src={preview.url} alt={label} className="h-44 w-full object-contain" />
          </a>
        ) : isPdf ? (
          <iframe src={preview.url} title={`${label} PDF preview`} className="h-44 w-full rounded-lg border-0" />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-gray-400">
            {previewLoading ? <RefreshCw size={22} className="animate-spin" /> : <FileText size={26} />}
            <span className="text-xs font-inter">{previewLoading ? 'Loading preview…' : previewError ? 'Preview unavailable — try View' : 'Document preview'}</span>
          </div>
        )}
      </div>
        <div className="min-w-0 p-3">
          <p className="break-words text-sm font-semibold capitalize text-brand-dark font-inter">{label}</p>
          {filename && <p className="mt-0.5 break-all text-xs text-gray-500 font-inter">{filename}</p>}
          {document.version && <p className="mt-1 text-[11px] text-gray-400 font-inter">Version {document.version}</p>}
          {document.verification_status && <p className="mt-1 text-xs capitalize text-gray-500 font-inter">{document.verification_status.replace(/_/g, ' ')}</p>}
          {document.verification_reason && <p className="mt-1 break-words text-xs text-gray-500 font-inter">{document.verification_reason}</p>}
          {!url && <p className="mt-1 text-xs text-amber-600 font-inter">Document link unavailable</p>}
        </div>
      {url && (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-3">
          <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-blue font-inter hover:bg-blue-50"><Eye size={13} /> View</a>
          <button type="button" onClick={download} disabled={downloading} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-blue font-inter hover:bg-blue-50 disabled:opacity-50">
            {downloading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Download
          </button>
        </div>
      )}
    </article>
  );
};

export const RecordDocuments = ({ record }) => {
  const recordId = record.id || record.user_id || record.entity_id;
  const [snapshot, setSnapshot] = useState(null);
  const [revision, setRevision] = useState(0);
  // A response for User A can never render while User B is selected.
  const current = snapshot?.recordId === recordId ? snapshot : null;
  const documents = current?.documents ?? getRecordDocuments(record);
  const loading = current?.loading ?? !Array.isArray(record.documents);
  const error = current?.error;

  useEffect(() => {
    let active = true;
    // Batch details already contain the complete collection. Render it
    // immediately; only refresh or an older response needs a detail request.
    if (Array.isArray(record.documents) && revision === 0) {
      setSnapshot(null);
      return () => { active = false; };
    }
    setSnapshot((previous) => ({ recordId, loading: true, error: null,
      documents: previous?.recordId === recordId ? previous.documents : getRecordDocuments(record) }));
    const load = async () => {
      try {
        if (!recordId) throw new Error('Record ID unavailable');
        const { data } = await verificationAPI.getUserVerification(recordId);
        if (data?.id !== recordId) throw new Error('The server returned a different user');
        if (!Array.isArray(data?.documents)) throw new Error('Document list unavailable');
        if (active) setSnapshot({ recordId, documents: getRecordDocuments(data), loading: false, error: null });
      } catch (err) {
        if (active) {
          setSnapshot((previous) => ({ recordId, loading: false,
            documents: previous?.recordId === recordId ? previous.documents : getRecordDocuments(record),
            error: getApiError(err, 'Could not load the latest documents. Please retry.') }));
        }
      }
    };
    load();
    return () => { active = false; };
  }, [recordId, record.documents, revision]);

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 font-inter">Additional &amp; Uploaded Documents{!loading && ` (${documents.length})`}</h4>
        <button type="button" onClick={() => setRevision((prev) => prev + 1)} disabled={loading} className="flex items-center gap-1 text-xs text-brand-blue font-inter disabled:opacity-50"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh</button>
      </div>
      <p className="text-xs text-gray-500 font-inter">Saved source documents, photos, and additional attachments for this person.</p>
      {loading && <p className="py-4 text-center text-xs text-gray-400 font-inter">Loading documents…</p>}
          {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 font-inter">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document, index) => <DocumentRow key={document.id || `${document.document_url}-${index}`} document={document} index={index} />)}
          </div>
          {!loading && !error && documents.length === 0 && <p className="rounded-xl border border-gray-100 p-4 text-center text-xs text-gray-400 font-inter">No documents attached to this record.</p>}
    </section>
  );
};
