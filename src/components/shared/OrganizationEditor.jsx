import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { DhiwaysDetailsEditor } from '@/components/shared/DhiwaysDetailsEditor';
import { OrgSchemaConfigsPanel } from '@/components/shared/OrgSchemaConfigsPanel';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';
import { normalizeDhiwayDetails } from '@/utils/dhiway';
import { adminAPI, getApiError } from '@/services/api';
import toast from 'react-hot-toast';
const USE_CASE_OPTIONS = [
  { key: 'primary', label: 'Product verification' },
  { key: 'secondary', label: 'Human verification' },
];

export const OrganizationEditor = ({ onClose, orgId, onSuccess }) => {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({
    organization_name: '', service_type: '', industry_type: '', gstin: '',
    business_reg_number: '', address_line1: '', address_line2: '', address_line3: '',
    use_cases: {}, dhiways_details: [],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setOrg(null);
    setLoadError(null);
    setLoading(true);
    adminAPI.getOrganization(orgId)
      .then(({ data }) => setOrg(data))
      .catch((err) => {
        const status = err?.response?.status;
        setLoadError(status === 404 ? 'Organization could not be found.' : status === 403 ? 'SuperAdmin access is required.' : getApiError(err, 'Failed to load organization'));
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (org) {
      setForm({
        organization_name: org.organization_name || '',
        service_type: org.service_type || '',
        industry_type: org.industry_type || '',
        gstin: org.gstin || '',
        business_reg_number: org.business_reg_number || '',
        address_line1: org.address_line1 || '',
        address_line2: org.address_line2 || '',
        address_line3: org.address_line3 || '',
        use_cases: org.use_cases || {},
        dhiways_details: normalizeDhiwayDetails(org.dhiways_details || []),
      });
    }
  }, [org]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleUseCase = (key) => {
    setForm((f) => {
      const next = { ...f.use_cases };
      if (next[key]) delete next[key];
      else next[key] = true;
      return { ...f, use_cases: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        use_cases: form.use_cases,
        dhiways_details: form.dhiways_details
          .map((row) => ({
            space_id: (row.space_id || '').trim(),
            schema_id: (row.schema_id || '').trim(),
            space_type: row.space_type || undefined,
            default: !!row.default,
          }))
          .filter((row) => row.space_id || row.schema_id),
      };
      if (form.organization_name.trim()) payload.organization_name = form.organization_name.trim();
      if (form.service_type) payload.service_type = form.service_type;
      if (form.industry_type.trim()) payload.industry_type = form.industry_type.trim();
      if (form.gstin.trim()) payload.gstin = form.gstin.trim();
      if (form.business_reg_number.trim()) payload.business_reg_number = form.business_reg_number.trim();
      if (form.address_line1.trim()) payload.address_line1 = form.address_line1.trim();
      if (form.address_line2.trim()) payload.address_line2 = form.address_line2.trim();
      if (form.address_line3.trim()) payload.address_line3 = form.address_line3.trim();
      await adminAPI.updateOrganization(org.id, payload);
      toast.success('Organization updated');
      onSuccess();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) toast.error('Organization could not be found.');
      else if (status === 403) toast.error('SuperAdmin access is required.');
      else toast.error(getApiError(err, 'Failed to update organization'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-7">
      {loading ? (
        <LoadingSkeleton variant="form" label="Loading organization form" />
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-sm text-gray-500 font-inter">{loadError}</p>
        </div>
      ) : org && (
        <form id="edit-organization-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 flex items-center gap-3 px-3 py-2.5 bg-brand-bg rounded-xl">
            <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-sm font-bold text-brand-blue font-sora uppercase">
              {org.organization_name?.[0] || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-dark font-inter truncate">{org.organization_name || '—'}</p>
            </div>
          </div>

          <Input label="Organization Name" value={form.organization_name} onChange={set('organization_name')} placeholder="Acme Corp" />

          <div>
            <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Service Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERVICE_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                const selected = form.service_type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={submitting}
                    onClick={() => setForm((f) => ({ ...f, service_type: value }))}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition-all duration-200 disabled:opacity-50 ${
                      selected ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={14} className={selected ? 'text-brand-blue' : 'text-gray-400'} />
                    <span className="text-xs font-medium font-inter text-brand-dark">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Industry Type" placeholder="e.g. Healthcare" value={form.industry_type} onChange={set('industry_type')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="GSTIN" value={form.gstin} onChange={set('gstin')} placeholder="27ABCDE1234F1Z5" />
            <Input label="Business Reg. No." value={form.business_reg_number} onChange={set('business_reg_number')} placeholder="U74999MH2020PTC123456" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-dark font-inter">Registered Address</label>
            <Input placeholder="Address Line 1" value={form.address_line1} onChange={set('address_line1')} />
            <Input placeholder="Address Line 2" value={form.address_line2} onChange={set('address_line2')} />
            <Input placeholder="Address Line 3" value={form.address_line3} onChange={set('address_line3')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Use Cases</label>
            <div className="flex flex-wrap gap-2">
              {USE_CASE_OPTIONS.map(({ key, label }) => {
                const selected = Boolean(form.use_cases[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={submitting}
                    onClick={() => toggleUseCase(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-inter border transition-colors disabled:opacity-50 ${
                      selected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 md:col-span-2">
            <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Dhiway Spaces</label>
            <div className="[&>div>div]:flex-wrap [&_input]:min-w-0 [&_input]:basis-40">
            <DhiwaysDetailsEditor
              value={form.dhiways_details}
              onChange={(rows) => setForm((f) => ({ ...f, dhiways_details: rows }))}
              disabled={submitting}
              onSetDefault={async (row) => {
                try {
                  await adminAPI.setDhiwayDefault({
                    spaceId: row.space_id, schemaId: row.schema_id, spaceType: row.space_type, orgId: org.id,
                  });
                  toast.success('Default Dhiway space updated');
                } catch (err) {
                  toast.error(getApiError(err, 'Failed to set default'));
                  throw err;
                }
              }}
            />
            </div>
          </div>

          <div className="md:col-span-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
            <p className="text-[11px] text-gray-400 font-inter leading-relaxed">
              Account status, approval, email verification, GST verification, and onboarding are managed separately from this form — use the corresponding actions in the organization list.
            </p>
          </div>

        </form>
      )}

      {/* Separate, independent system from the Dhiway Spaces editor inside
          the form above — each action here (create/version/set-default/
          deactivate) is its own immediate API call, never part of the
          "Save Changes" submit. See OrgSchemaConfigsPanel. */}
      {org && !loading && !loadError && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <OrgSchemaConfigsPanel orgId={org.id} isSuperAdminViewer />
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-5">{org && !loading && !loadError ? (
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 font-inter hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="submit" form="edit-organization-form" disabled={submitting} className="rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white font-inter hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Saving...' : 'Save Changes'}</button>
        </div>
      ) : null}</div>
    </div>
  );
};
