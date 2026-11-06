import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Modal } from '@/components/ui/Modal';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PageIntro, OutlineButton, SearchField, SummaryBanner, Avatar } from '@/components/shared/AdminPageParts';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { sdcAPI, verificationAPI, getApiError } from '@/services/api';
import { AUTHORIZATION_STATUS, ITEM_STATE_LABEL, authorizationIsStale } from '@/utils/partialSdc';

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'generating', label: 'Generating' },
  { value: 'consumed', label: 'Used' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'superseded', label: 'Replaced' },
  { value: '', label: 'All' },
];

const PILL = { green: 'bg-green-100 text-green-700', blue: 'bg-blue-100 text-brand-blue', gray: 'bg-gray-100 text-gray-600' };
const when = (value) => (value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

// SuperAdmin: the partial SDC authorizations organizations have saved. Read-only here: the organization
// authorizes and cancels; the SuperAdmin generates from the batch (Generate SDC picks these up).
export const PartialAuthorizations = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('active');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [names, setNames] = useState({ batches: {}, orgs: {} });
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // batch id -> name / organization name, so rows read as names rather than ids.
  useEffect(() => {
    let active = true;
    verificationAPI.getBatches()
      .then(({ data }) => {
        if (!active) return;
        const batches = {};
        const orgs = {};
        (Array.isArray(data) ? data : []).forEach((group) => {
          if (group?.org_id) orgs[group.org_id] = group.organization_name;
          (group?.batches || []).forEach((b) => {
            const id = b.batch_id || b.id;
            if (id) batches[id] = { name: b.batch_name || b.name, org: group.organization_name };
          });
        });
        setNames({ batches, orgs });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await sdcAPI.getPartialAuthorizations({ status });
      setRows(Array.isArray(data?.authorizations) ? data.authorizations : []);
    } catch (err) {
      toast.error(getApiError(err, 'Could not load partial SDC authorizations'));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (row) => {
    setDetail(row);
    setDetailLoading(true);
    try {
      const { data } = await sdcAPI.getPartialAuthorization(row.id);
      setDetail(data);
    } catch (err) {
      toast.error(getApiError(err, 'Could not load this authorization'));
    } finally {
      setDetailLoading(false);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => rows.filter((r) => {
    if (!q) return true;
    const batch = names.batches[r.batch_id];
    return [r.holder_name, batch?.name, batch?.org || names.orgs[r.org_id], ...(r.items || []).map((i) => i.verification_type_name)]
      .some((v) => String(v || '').toLowerCase().includes(q));
  }), [rows, q, names]);
  const staleCount = rows.filter(authorizationIsStale).length;

  return (
    <AuthLayout title="SDC Authorizations" breadcrumb={['Administration', 'SDC Authorizations']}>
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro
          eyebrow="Verification operations"
          title="SDC authorizations"
          subtitle="Holders an organization allowed to receive an SDC with only their approved verifications."
          actions={<OutlineButton icon={RefreshCw} onClick={() => load(true)} disabled={loading || refreshing}>Refresh</OutlineButton>}
        />
        <SummaryBanner
          icon={ShieldCheck}
          label={status === '' ? 'Authorizations' : `${TABS.find((t) => t.value === status)?.label} authorizations`}
          value={loading ? '—' : rows.length}
          segments={[
            'Generate from the batch: Generate SDC uses each holder’s active authorization.',
            loading ? 'Loading…' : staleCount ? `${staleCount} need re-authorization` : 'All results are up to date',
          ]}
        />

        <section aria-label="Authorizations" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="flex flex-col gap-3 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <SlidingTabs variant="pills" toggle ariaLabel="Authorization status" value={status} onChange={setStatus} tabs={TABS} />
            <SearchField search={query} onSearch={setQuery} placeholder="Search holder, batch or organization" className="w-full lg:w-80" />
          </div>

          {loading ? (
            <div className="px-5 pb-5"><LoadingSkeleton variant="table" label="Loading authorizations" columns={6} /></div>
          ) : visible.length === 0 ? (
            <div className="border-t border-gray-100 py-14 text-center">
              <ShieldCheck size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-600 font-inter">{rows.length === 0 ? 'No authorizations here yet' : 'Nothing matches your search'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[860px] border-collapse text-left text-xs font-inter">
                <thead>
                  <tr>
                    <th className="px-5 py-2.5">Holder</th>
                    <th className="px-4 py-2.5">Batch</th>
                    <th className="px-4 py-2.5">Authorized verifications</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Authorized</th>
                    <th className="px-5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((row, i) => {
                    const meta = AUTHORIZATION_STATUS[row.status] || { label: row.status, tone: 'gray' };
                    const stale = authorizationIsStale(row);
                    const batch = names.batches[row.batch_id];
                    return (
                      <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="cursor-pointer transition-colors hover:bg-blue-50/30" onClick={() => openDetail(row)}>
                        <td className="px-5 py-2.5"><div className="flex items-center gap-3"><Avatar name={row.holder_name} /><span className="text-[13px] font-medium text-brand-dark">{row.holder_name || 'Holder'}</span></div></td>
                        <td className="px-4 py-2.5">
                          <p className="text-[13px] text-brand-dark">{batch?.name || `${String(row.batch_id).slice(0, 8)}…`}</p>
                          <p className="text-[11px] text-gray-500">{batch?.org || names.orgs[row.org_id] || ''}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {(row.items || []).map((item) => (
                              <span key={item.verification_type_name} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${item.current_state === 'valid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{item.verification_type_name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${PILL[meta.tone] || PILL.gray}`}>{meta.label}</span>
                          {stale && <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle size={11} />Results changed</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-[#2f3b52]">{when(row.created_at)}</td>
                        <td className="px-5 py-2.5 text-right">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(row); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#c7d8f5] bg-[#f3f7fe] px-3 text-xs font-medium text-brand-blue hover:bg-blue-50">Details</button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && rows.length >= 500 && <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 font-inter">Showing the newest 500. Narrow the status or search to find older ones.</p>}
        </section>
      </div>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Partial SDC authorization" size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><p className="text-[11px] text-gray-500 font-inter">Holder</p><p className="font-medium text-brand-dark font-inter">{detail.holder_name || '—'}</p></div>
              <div><p className="text-[11px] text-gray-500 font-inter">Status</p><p className="font-medium text-brand-dark font-inter">{(AUTHORIZATION_STATUS[detail.status] || {}).label || detail.status}{detailLoading ? ' …' : ''}</p></div>
              <div><p className="text-[11px] text-gray-500 font-inter">Batch</p><p className="font-medium text-brand-dark font-inter">{names.batches[detail.batch_id]?.name || detail.batch_id}</p></div>
              <div><p className="text-[11px] text-gray-500 font-inter">Organization</p><p className="font-medium text-brand-dark font-inter">{names.batches[detail.batch_id]?.org || names.orgs[detail.org_id] || detail.org_id}</p></div>
              <div><p className="text-[11px] text-gray-500 font-inter">Authorized</p><p className="font-inter text-brand-dark">{when(detail.created_at)}</p></div>
              {detail.consumed_at && <div><p className="text-[11px] text-gray-500 font-inter">SDC generated</p><p className="font-inter text-brand-dark">{when(detail.consumed_at)}</p></div>}
              {detail.cancelled_at && <div><p className="text-[11px] text-gray-500 font-inter">Cancelled</p><p className="font-inter text-brand-dark">{when(detail.cancelled_at)}</p></div>}
            </div>

            {authorizationIsStale(detail) && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 font-inter">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Verification results changed after this was authorized{(detail.stale_verification_types || []).length ? ` (${detail.stale_verification_types.join(', ')})` : ''}. Generation will be refused until the organization authorizes again.</span>
              </div>
            )}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 font-inter">Authorized verifications</p>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
                {(detail.items || []).map((item) => (
                  <li key={item.verification_type_name} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-brand-dark font-inter">
                      {item.current_state === 'valid' ? <CheckCircle2 size={15} className="text-green-600" /> : <XCircle size={15} className="text-amber-600" />}
                      {item.verification_type_name}
                    </span>
                    <span className="text-xs text-gray-500 font-inter">{ITEM_STATE_LABEL[item.current_state] || item.current_state}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Modal.Footer className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDetail(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 font-inter hover:bg-gray-50">Close</button>
              <button type="button" onClick={() => navigate(`/admin/batch-monitor/${detail.batch_id}`)} className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white font-inter hover:bg-blue-700">
                Open batch to generate <ArrowRight size={15} />
              </button>
            </Modal.Footer>
          </div>
        )}
      </Modal>
    </AuthLayout>
  );
};

export default PartialAuthorizations;
