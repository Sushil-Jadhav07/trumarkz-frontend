import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { adminAPI, getApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  Search, Building2, RefreshCw, Eye, Pencil, CheckCircle,
  ShieldOff, UserX, Trash2, AlertTriangle, ChevronLeft, ChevronRight,
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

const Badge = ({ tone, children, title }) => {
  const tones = {
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-brand-blue',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <span title={title} className={`px-2 py-0.5 rounded-full text-[11px] font-medium font-inter ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
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
  const [pageSize, setPageSize] = useState(10);

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

  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedOrgs = filteredOrgs.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIdx = filteredOrgs.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredOrgs.length);

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
  }, [filteredOrgs, safePage, pageSize]);

  // Six action buttons need 176px (26px each plus five 4px gaps).
  const GRID = 'grid-cols-[minmax(240px,1.6fr)_110px_130px_110px_110px_110px_110px_100px_110px_192px]';

  return (
    <AuthLayout title="Organizations">
      <PageHeader
        title="Organizations"
        subtitle="Manage organization accounts — view, edit, approve, and more"
        action={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-inter disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mb-5">
        <Card className="px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-brand-blue" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-inter">Total Organizations</p>
            <p className="text-2xl font-bold text-brand-dark font-sora leading-none mt-1">{loading ? '—' : orgs.length}</p>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.04 }} className="mb-5">
        <div className="max-w-sm">
          <Input type="text" placeholder="Search by name, service, or industry…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.08 }}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1360px]">
              <div className={`grid ${GRID} gap-3 px-5 py-3 bg-brand-bg border-b border-gray-100`}>
                {['Organization', 'Service Type', 'Industry', 'GST Status', 'Approval', 'Onboarding', 'Dhiway Setup', 'Account', 'Created', 'Actions'].map((h) => (
                  <span key={h} className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wide font-inter ${h === 'Actions' ? 'text-right' : ''}`}>{h}</span>
                ))}
              </div>

              {loading && (
                <div role="status" aria-busy="true" aria-label="Loading organizations" className="divide-y divide-gray-50">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`grid ${GRID} gap-3 px-5 py-4 motion-safe:animate-pulse items-center`}>
                      <div className="h-3.5 bg-gray-100 rounded w-32" />
                      <div className="h-3.5 bg-gray-100 rounded w-16" />
                      <div className="h-3.5 bg-gray-100 rounded w-20" />
                      <div className="h-5 bg-gray-100 rounded-full w-16" />
                      <div className="h-5 bg-gray-100 rounded-full w-16" />
                      <div className="h-5 bg-gray-100 rounded-full w-16" />
                      <div className="h-5 bg-gray-100 rounded-full w-14" />
                      <div className="h-3.5 bg-gray-100 rounded w-14" />
                      <div className="flex gap-1 justify-end">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg" />
                        <div className="w-7 h-7 bg-gray-100 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && filteredOrgs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Building2 size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-brand-dark font-sora">No organizations found</p>
                  <p className="text-xs text-gray-400 font-inter mt-1">{search ? 'Try a different search term.' : 'No organizations yet.'}</p>
                </div>
              )}

              {!loading && filteredOrgs.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {paginatedOrgs.map((org, i) => (
                    <motion.div
                      key={org.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.012 }}
                      className={`grid ${GRID} gap-3 px-5 py-3.5 items-center hover:bg-gray-50/60 transition-colors ${!org.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-brand-blue font-sora uppercase">
                          {org.organization_name?.[0] || '?'}
                        </div>
                        <button type="button" onClick={() => navigate(`/admin/organizations/${encodeURIComponent(org.id)}`)} title="View organization details" className="truncate text-left text-sm font-medium text-brand-dark font-inter hover:text-brand-blue hover:underline focus-visible:outline-brand-blue">{org.organization_name || 'Organization'}</button>
                      </div>
                      <span className="text-xs text-gray-500 font-inter truncate capitalize">{org.service_type || '—'}</span>
                      <span className="text-xs text-gray-500 font-inter truncate">{org.industry_type || '—'}</span>
                      <div><Badge tone={org.gst_verified ? 'green' : 'gray'}>{org.gst_verified ? 'Verified' : 'Not Verified'}</Badge></div>
                      <div><Badge tone={org.org_approved ? 'blue' : 'amber'}>{org.org_approved ? 'Approved' : 'Pending'}</Badge></div>
                      <div><Badge tone={org.onboarding_completed ? 'green' : 'amber'}>{org.onboarding_completed ? 'Completed' : 'Pending'}</Badge></div>
                      {/* Whether this org has been given at least one Dhiway
                          space_id/schema_id yet (dhiways_details) — without
                          this, the org can't generate SDC certificates at
                          all. Flags freshly onboarded orgs still waiting on
                          SuperAdmin to provision them (see the org-side
                          "Setup in progress" banner, same underlying check).
                          Resolved per-row above since the list endpoint
                          itself doesn't carry this field. */}
                      <div>
                        {(() => {
                          const status = typeof org.has_dhiway_space === 'boolean'
                            ? { ok: org.has_dhiway_space, server: true }
                            : dhiwayStatus[org.id];
                          if (status === undefined || status === 'loading') {
                            return <Badge tone="gray"><RefreshCw size={9} className="animate-spin" /></Badge>;
                          }
                          if (status === null) {
                            return <Badge tone="gray" title="Could not check — try Refresh">Unknown</Badge>;
                          }
                          const via = status.ok
                            ? [status.legacy && 'Dhiway Spaces', status.viaSchema && 'Schema Configurations'].filter(Boolean).join(' + ')
                            : '';
                          return (
                            <Badge
                              tone={status.ok ? 'green' : 'amber'}
                              title={status.ok
                                ? (status.server ? 'Configured — a Dhiway Spaces row or an active Schema Configuration' : `Configured via ${via}`)
                                : 'No Dhiway space given yet (no Dhiway Spaces row and no active Schema Configuration) — SDC generation is blocked for this org'}
                            >
                              {status.ok ? 'Configured' : 'Needs Setup'}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div><Badge tone={org.is_active ? 'green' : 'gray'}>{org.is_active ? 'Active' : 'Inactive'}</Badge></div>
                      <span className="whitespace-nowrap text-xs text-gray-400 font-inter">{formatDate(org.created_at)}</span>

                      <div className="flex min-w-0 items-center justify-end gap-1 [&_button]:shrink-0">
                        <button type="button" onClick={() => navigate(`/admin/organizations/${encodeURIComponent(org.id)}`)} title="View organization details" className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => navigate(`/admin/organizations/${encodeURIComponent(org.id)}/edit`)} title="Edit organization" className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                          <Pencil size={14} />
                        </button>
                        {!org.org_approved && (
                          <button type="button" onClick={() => handleApprove(org)} disabled={approvingId === org.id} title="Mark organization as approved" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                            {approvingId === org.id ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          </button>
                        )}
                        {org.gst_verified && (
                          <button type="button" onClick={() => setUnverifyGstTarget(org)} title="Revoke GST verification" className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            <ShieldOff size={14} />
                          </button>
                        )}
                        {org.is_active && org.id !== currentUser?.id && (
                          <button type="button" onClick={() => setDeactivateTarget(org)} title="Deactivate organization" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <UserX size={14} />
                          </button>
                        )}
                        {org.id !== currentUser?.id && (
                          <button type="button" onClick={() => setPermanentDeleteTarget(org)} title="Permanently delete organization" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!loading && filteredOrgs.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-brand-bg">
              <p className="text-xs text-gray-400 font-inter">
                Showing {startIdx}–{endIdx} of {filteredOrgs.length}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-500 font-inter">Page {safePage} of {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

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
