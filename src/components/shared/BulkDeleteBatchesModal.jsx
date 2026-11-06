import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, MinusCircle, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { verificationAPI, getApiError } from '@/services/api';
import { BULK_DELETE_LIMIT, BULK_DELETE_WORD, BULK_RESULT_LABEL, bulkDeleteReady } from '@/utils/partialSdc';

const RESULT_ICON = {
  deleted: <CheckCircle2 size={15} className="text-green-600" />,
  not_found: <MinusCircle size={15} className="text-gray-500" />,
  skipped_processing: <MinusCircle size={15} className="text-amber-600" />,
  failed: <XCircle size={15} className="text-red-600" />,
};

// SuperAdmin: permanently delete several batches (any organizations, at most 50) after typing DELETE.
// Each batch is independent: processing batches are skipped, one failure never stops the others.
// `batches` is [{ id, name, orgName }]; onDone(results) lets the page refresh and keep the rest selected.
export const BulkDeleteBatchesModal = ({ batches, onClose, onDone }) => {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  const open = Array.isArray(batches) && batches.length > 0;
  useEffect(() => { if (open) { setTyped(''); setError(''); setResponse(null); } }, [open]);
  if (!open) return null;

  const ids = batches.map((b) => b.id);
  const ready = bulkDeleteReady(typed, ids) && !deleting;
  const nameOf = (id) => batches.find((b) => b.id === id);

  const confirm = async () => {
    if (!ready) return;
    setDeleting(true);
    setError('');
    try {
      const { data } = await verificationAPI.bulkDeleteBatches(ids, typed);
      setResponse(data || { results: [] });
      const gone = (data?.results || []).filter((r) => r.status === 'deleted').length;
      if (gone > 0) toast.success(`${gone} batch${gone === 1 ? '' : 'es'} deleted`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setError('Only a SuperAdmin can delete batches.');
      else setError(getApiError(err, 'Could not delete the selected batches. Nothing was changed.'));
    } finally {
      setDeleting(false);
    }
  };

  const close = () => {
    if (deleting) return;
    if (response) onDone?.(response.results || []);
    onClose();
  };

  // ── Result ────────────────────────────────────────────────────────────────
  if (response) {
    const results = response.results || [];
    const orphaned = results.filter((r) => r.dhiway_records_orphaned);
    return (
      <Modal isOpen onClose={close} title="Bulk delete finished" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Deleted', response.deleted_count, 'text-green-700 bg-green-50'],
              ['Not found', response.not_found_count, 'text-gray-700 bg-gray-50'],
              ['Still processing', response.skipped_processing_count, 'text-amber-700 bg-amber-50'],
              ['Failed', response.failed_count, 'text-red-700 bg-red-50'],
            ].map(([label, value, tone]) => (
              <div key={label} className={`rounded-xl px-3 py-2.5 ${tone}`}>
                <p className="text-[11px] font-inter opacity-80">{label}</p>
                <p className="font-sora text-xl font-bold">{value ?? 0}</p>
              </div>
            ))}
          </div>

          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
            {results.map((r) => {
              const meta = nameOf(r.batch_id);
              return (
                <li key={r.batch_id} className="flex items-start gap-3 px-3.5 py-2.5">
                  <span className="mt-0.5 shrink-0">{RESULT_ICON[r.status] || RESULT_ICON.failed}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark font-inter">{r.batch_name || meta?.name || r.batch_id}</p>
                    <p className="text-xs text-gray-500 font-inter">
                      {BULK_RESULT_LABEL[r.status] || r.status}
                      {r.status === 'deleted' && r.deleted_users_count != null ? ` · ${r.deleted_users_count} record${r.deleted_users_count === 1 ? '' : 's'} removed` : ''}
                    </p>
                    {r.status === 'failed' && r.error && <p role="alert" className="mt-0.5 text-xs text-red-600 font-inter">{r.error}</p>}
                  </div>
                </li>
              );
            })}
          </ul>

          {orphaned.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-xs text-amber-800 font-inter">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Dhiway credentials remain live</p>
                <p className="mt-0.5">Credentials already issued for these batches cannot be revoked from here and still resolve on Dhiway.</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                  {orphaned.map((r) => <li key={r.batch_id}>{r.batch_name || r.batch_id}: {(r.certificate_ids || []).join(', ') || 'no ids returned'}</li>)}
                </ul>
              </div>
            </div>
          )}

          <Modal.Footer className="flex justify-end"><Button variant="primary" size="sm" onClick={close}>Done</Button></Modal.Footer>
        </div>
      </Modal>
    );
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  return (
    <Modal isOpen onClose={close} title={`Delete ${batches.length} batch${batches.length === 1 ? '' : 'es'} permanently`} size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div className="text-sm text-red-700 font-inter">
            <p className="font-semibold">This cannot be undone.</p>
            <p className="mt-1 text-red-600">
              Permanently deletes these batches and all their TruMarkZ data (holders, documents, verification requests and reports, certificate-access grants, partial-SDC authorizations). Issued Dhiway credentials are not deleted and stay live on Dhiway.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600 font-inter">Batches to delete ({batches.length}/{BULK_DELETE_LIMIT} at most)</p>
          <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
            {batches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                <span className="min-w-0 truncate text-sm text-brand-dark font-inter">{b.name}</span>
                <span className="shrink-0 truncate text-xs text-gray-500 font-inter">{b.orgName}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-gray-500 font-inter"><Info size={12} className="mt-0.5 shrink-0" />A batch that is still processing is never deleted; it is reported back as skipped.</p>
        </div>

        <div>
          <label htmlFor="bulk-delete-confirm" className="mb-1.5 block text-xs font-medium text-gray-600 font-inter">
            Type <span className="font-semibold text-gray-800">{BULK_DELETE_WORD}</span> to confirm
          </label>
          <input
            id="bulk-delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={BULK_DELETE_WORD}
            disabled={deleting}
            autoComplete="off"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-inter outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:bg-gray-50"
          />
          {error && <p role="alert" className="mt-2 text-xs text-red-600 font-inter">{error}</p>}
        </div>

        <Modal.Footer className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={close} disabled={deleting}>Cancel</Button>
          <Button variant="danger" size="sm" icon={Trash2} loading={deleting} disabled={!ready} onClick={confirm}>Delete permanently</Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

export default BulkDeleteBatchesModal;
