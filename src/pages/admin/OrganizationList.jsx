import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Modal } from '@/components/ui/Modal';
import {
  PageIntro, OutlineButton, SummaryBanner, DirectoryBar, StatusText, Avatar, RowActionMenu, NumberedPager, SortLabel,
} from '@/components/shared/AdminPageParts';
import { pageRange } from '@/utils/pagination';
import { useNavigate } from 'react-router-dom';
import { adminAPI, getApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, RefreshCw, Pencil, CheckCircle, ShieldOff, UserX, Trash2, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// A dedicated, organization-scoped page — deliberately separate from the
// generic User List, per explicit product direction. Uses ONLY
// GET /auth/organizations, GET /auth/organizations/{id} and
// PATCH /auth/organizations/{id} for organization data/editing; the
// existing approve/deactivate/GST actions below are the same pre-existing
// endpoints the old User List used, kept here so nothing is lost by moving
// organization management off that page.

const ORGS_FETCH_LIMIT = 500;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// At least one Dhiway space_id/schema_id (dhiways_details) given to this
// org — same check the org-side "Setup in progress" banner uses.
const hasDhiwaySpace = (data) =>
  Array.isArray(data?.dhiways_details) && data.dhiways_details.some((row) => row?.space_id);

const ConfirmModal = ({ isOpen, onClose, title, message, confirmLabel, tone = 'red', onConfirm }) => {
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={submitting ? undefined : onClose} title={title} size="sm">
      <div className="space-y-5 pt-2">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tone === 'red' ? 'bg-red-50' : 'bg-amber-50'}`}>
            <AlertTriangle size={22} className={tone === 'red' ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div>
            
            <p className="text-sm text-gray-500 font-inter mt-1">{message}</p>
          </div>
        </div>
        <Modal.Footer className="flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium font-inter transition-colors disabled:opacity-60 ${tone === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
export const OrganizationList = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort, setSort] = useState({ key: 'created', dir: 'desc' });

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [unverifyGstTarget, setUnverifyGstTarget] = useState(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  // GET /auth/organizations (the list endpoint) doesn't include
  // dhiways_details — confirmed live: a row that the single-org GET shows
  // as fully configured still came back with nothing to check here. So this
  // is resolved per-row instead, scoped to whichever page is currently on
  // screen (not all 500 at once) — true/false once confirmed, 'loading'
  // while in flight, null if that one row's fetch failed.
  const [dhiwayStatus, setDhiwayStatus] = useState({});

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getOrganizations({ limit: ORGS_FETCH_LIMIT, offset: 0 });
      setOrgs(Array.isArray(data?.organizations) ? data.organizations : []);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load organizations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const refresh = () => { setDhiwayStatus({}); fetchOrgs(); };

  const handleApprove = async (org) => {
    setApprovingId(org.id);
    try {
      await adminAPI.approveOrganization(org.id);
      toast.success(`${org.organization_name || 'Organization'} approved`);
      refresh();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to approve organization'));
    } finally {
      setApprovingId(null);
    }
  };

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((o) =>
      [o.organization_name, o.service_type, o.industry_type].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [orgs, search]);

  const toggleSort = (key) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'created' ? 'desc' : 'asc' }));
  const sortedOrgs = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filteredOrgs].sort((a, b) => dir * (sort.key === 'created'
      ? new Date(a.created_at || 0) - new Date(b.created_at || 0)
      : String(a.organization_name || '').localeCompare(String(b.organization_name || ''))));
  }, [filteredOrgs, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedOrgs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedOrgs = sortedOrgs.slice((safePage - 1) * pageSize, safePage * pageSize);
  const { from: startIdx, to: endIdx } = pageRange(safePage, pageSize, sortedOrgs.length);
  const serviceTypes = [...new Set(orgs.map((o) => o.service_type).filter(Boolean))];

  // Resolve Dhiway Setup status for whichever rows are actually on screen —
  // one GET /auth/organizations/{id} per not-yet-checked row, never all of
  // them at once. Re-runs when the page/search changes; already-resolved
  // ids are skipped (dhiwayStatus is deliberately not a dependency here, or
  // every resolve would re-trigger this).
  useEffect(() => {
    // The list now carries has_dhiway_space (Dhiway Spaces row OR active Schema Configuration),
    // computed by the server. Only rows without it — an older backend — fall back to per-row reads.
    const idsToCheck = paginatedOrgs
      .filter((o) => typeof o.has_dhiway_space !== 'boolean')
      .map((o) => o.id)
      .filter((id) => id && dhiwayStatus[id] === undefined);
    if (idsToCheck.length === 0) return;
    setDhiwayStatus((prev) => {
      const next = { ...prev };
      idsToCheck.forEach((id) => { next[id] = 'loading'; });
      return next;
    });
    // An org is set up through either system: a legacy Dhiway Spaces row, or an active Schema
    // Configuration (which carries its own space_id/schema_id). Checking only the first made every
    // schema-config-only org look unconfigured.
    idsToCheck.forEach((id) => {
      Promise.allSettled([
        adminAPI.getOrganization(id),
        adminAPI.getSchemaConfigs(id, { activeOnly: true }),
      ]).then(([orgRes, cfgRes]) => {
        const legacy = orgRes.status === 'fulfilled' && hasDhiwaySpace(orgRes.value.data);
        const configs = cfgRes.status === 'fulfilled' && Array.isArray(cfgRes.value.data?.configs) ? cfgRes.value.data.configs : null;
        const viaSchema = !!configs?.some((c) => c.is_active !== false && c.space_id);
        let status;
        if (legacy || viaSchema) status = { ok: true, legacy, viaSchema };
        else if (orgRes.status === 'rejected' || configs === null) status = null; // can't tell — never guess "Needs Setup"
        else status = { ok: false };
        setDhiwayStatus((prev) => ({ ...prev, [id]: status }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedOrgs, safePage, pageSize]);

  const dhiwayCell = (org) => {
    const status = typeof org.has_dhiway_space === 'boolean' ? { ok: org.has_dhiway_space, server: true } : dhiwayStatus[org.id];
    if (status === undefined || status === 'loading') return <StatusText kind="neutral"><RefreshCw size={0} className="hidden" />Checking…</StatusText>;
    if (status === null) return <StatusText kind="neutral" title="Could not check — try Refresh">Unknown</StatusText>;
    const via = status.ok ? [status.legacy && 'Dhiway Spaces', status.viaSchema && 'Schema Configurations'].filter(Boolean).join(' + ') : '';
    return (
      <StatusText
        kind={status.ok ? 'good' : 'warning'}
        title={status.ok
          ? (status.server ? 'Configured — a Dhiway Spaces row or an active Schema Configuration' : `Configured via ${via}`)
          : 'No Dhiway space given yet (no Dhiway Spaces row and no active Schema Configuration) — SDC generation is blocked for this org'}
      >
        {status.ok ? 'Configured' : 'Needs setup'}
      </StatusText>
    );
  };

  const rowMenu = (org) => [
    { label: 'Edit organization', icon: Pencil, onClick: () => navigate(`/admin/organizations/${encodeURIComponent(org.id)}/edit`) },
    { label: 'Mark as approved', icon: CheckCircle, hidden: !!org.org_approved, disabled: approvingId === org.id, onClick: () => handleApprove(org) },
    { label: 'Revoke GST verification', icon: ShieldOff, tone: 'warning', hidden: !org.gst_verified, onClick: () => setUnverifyGstTarget(org) },
    { label: 'Deactivate organization', icon: UserX, tone: 'danger', hidden: !org.is_active || org.id === currentUser?.id, onClick: () => setDeactivateTarget(org) },
    { label: 'Delete permanently', icon: Trash2, tone: 'danger', hidden: org.id === currentUser?.id, onClick: () => setPermanentDeleteTarget(org) },
  ];

  const muted = 'text-[#7d8aa5]';

  return (
    <AuthLayout title="Organizations" breadcrumb={['Administration', 'Organizations']}>
      <PageIntro
        eyebrow="Organization management"
        title="Organizations"
        subtitle="Manage organization accounts, approvals and configuration."
        actions={<OutlineButton icon={RefreshCw} onClick={refresh} disabled={loading}>Refresh</OutlineButton>}
      />

      <SummaryBanner
        icon={Building2}
        label="Total organizations"
        value={loading ? '—' : orgs.length}
        segments={[
          'Registered organization accounts',
          <span key="svc" className="capitalize">{serviceTypes.length ? serviceTypes.join(' · ') : 'No service types yet'}</span>,
        ]}
      />

      <section aria-label="Organization directory" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <DirectoryBar
          title="Organization directory"
          count={loading ? null : orgs.length}
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search name, service or industry"
        />

        <div className="overflow-x-auto scrollbar-hidden">
          <table className="w-full min-w-[1180px] border-collapse text-left text-xs font-inter">
            <thead>
              <tr>
                <th aria-sort={sort.key === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-4 py-2.5"><SortLabel label="Organization" active={sort.key === 'name'} onClick={() => toggleSort('name')} /></th>
                {['Service', 'Industry', 'GST status', 'Approval', 'Onboarding', 'Dhiway setup', 'Account'].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}
                <th aria-sort={sort.key === 'created' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-3 py-2.5"><SortLabel label="Created" active={sort.key === 'created'} onClick={() => toggleSort('created')} /></th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} aria-hidden="true" className="motion-safe:animate-pulse">
                  {Array.from({ length: 10 }).map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 w-3/4 rounded bg-gray-100" /></td>)}
                </tr>
              ))}

              {!loading && sortedOrgs.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-14 text-center">
                    <Building2 size={22} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-brand-dark font-sora">No organizations found</p>
                    <p className="mt-1 text-xs text-gray-500">{search ? 'Try a different search term.' : 'No organizations yet.'}</p>
                  </td>
                </tr>
              )}

              {!loading && paginatedOrgs.map((org) => (
                <tr key={org.id} className={`transition-colors hover:bg-blue-50/30 ${!org.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={org.organization_name} />
                      <button type="button" onClick={() => navigate(`/admin/organizations/${encodeURIComponent(org.id)}`)} title="View organization details" className="truncate text-left text-[13px] text-brand-dark hover:text-brand-blue hover:underline">{org.organization_name || 'Organization'}</button>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 capitalize ${muted}`}>{org.service_type || '—'}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>{org.industry_type || '—'}</td>
                  <td className="px-3 py-2.5"><StatusText kind={org.gst_verified ? 'good' : 'neutral'}>{org.gst_verified ? 'Verified' : 'Not verified'}</StatusText></td>
                  <td className="px-3 py-2.5"><StatusText kind={org.org_approved ? 'approved' : 'pending'}>{org.org_approved ? 'Approved' : 'Pending'}</StatusText></td>
                  <td className="px-3 py-2.5"><StatusText kind={org.onboarding_completed ? 'good' : 'pending'}>{org.onboarding_completed ? 'Completed' : 'Pending'}</StatusText></td>
                  <td className="px-3 py-2.5">{dhiwayCell(org)}</td>
                  <td className="px-3 py-2.5"><StatusText kind={org.is_active ? 'active' : 'inactive'}>{org.is_active ? 'Active' : 'Inactive'}</StatusText></td>
                  <td className={`whitespace-nowrap px-3 py-2.5 ${muted}`}>{formatDate(org.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => navigate(`/admin/organizations/${encodeURIComponent(org.id)}`)} aria-label={`View ${org.organization_name || 'organization'}`} className="rounded px-1 text-xs font-semibold text-brand-blue hover:underline">View</button>
                      <RowActionMenu label={`Actions for ${org.organization_name || 'organization'}`} items={rowMenu(org)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && sortedOrgs.length > 0 && (
          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs text-gray-600 font-inter">Showing {startIdx}–{endIdx} of {sortedOrgs.length} organizations</p>
              <p className="mt-0.5 text-xs text-gray-500 font-inter">Account, approval and setup statuses are tracked separately.</p>
            </div>
            <NumberedPager page={safePage} totalPages={totalPages} onPage={setPage} />
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate Organization?"
        message={`${deactivateTarget?.organization_name || 'This organization'} will no longer be able to log in. This can be reversed later.`}
        confirmLabel="Deactivate"
        tone="red"
        onConfirm={async () => {
          try {
            await adminAPI.deactivateUser(deactivateTarget.id);
            toast.success('Organization deactivated');
            setDeactivateTarget(null);
            refresh();
          } catch (err) {
            toast.error(getApiError(err, 'Failed to deactivate organization'));
          }
        }}
      />

      <ConfirmModal
        isOpen={!!unverifyGstTarget}
        onClose={() => setUnverifyGstTarget(null)}
        title="Revoke GST Verification?"
        message={`${unverifyGstTarget?.organization_name || 'This organization'}'s GST verification will be revoked.`}
        confirmLabel="Revoke"
        tone="amber"
        onConfirm={async () => {
          try {
            await adminAPI.unverifyGstForOrg(unverifyGstTarget.id);
            toast.success('GST verification revoked');
            setUnverifyGstTarget(null);
            refresh();
          } catch (err) {
            toast.error(getApiError(err, 'Failed to revoke GST verification'));
          }
        }}
      />

      <ConfirmModal
        isOpen={!!permanentDeleteTarget}
        onClose={() => setPermanentDeleteTarget(null)}
        title="Permanently Delete Organization?"
        message={`This cannot be undone. ${permanentDeleteTarget?.organization_name || 'This organization'} and all associated data will be permanently removed.`}
        confirmLabel="Delete Permanently"
        tone="red"
        onConfirm={async () => {
          try {
            await adminAPI.permanentlyDeleteUser(permanentDeleteTarget.id);
            toast.success('Organization permanently deleted');
            setPermanentDeleteTarget(null);
            refresh();
          } catch (err) {
            toast.error(getApiError(err, 'Failed to delete organization'));
          }
        }}
      />
    </AuthLayout>
  );
};

export default OrganizationList;
