import { Building2 } from 'lucide-react';
import { SERVICE_TYPE_OPTIONS } from '@/data/serviceTypeOptions';

const Field = ({ label, value }) => <div className="min-w-0">
  <dt className="text-[11px] text-gray-400 font-inter">{label}</dt>
  <dd className="mt-1 break-words text-sm text-brand-dark font-inter">{value || '—'}</dd>
</div>;

const Section = ({ title, children }) => <section className="min-w-0 space-y-4">
  <h4 className="border-b border-gray-100 pb-2 text-sm font-semibold text-brand-dark font-inter">{title}</h4>
  {children}
</section>;

const Status = ({ good, children }) => <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium font-inter ${good ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{children}</span>;
const useCaseLabels = { primary: 'Product verification', secondary: 'Human verification' };
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const OrganizationDetails = ({ org }) => {
  const serviceLabel = SERVICE_TYPE_OPTIONS.find((option) => option.value === org.service_type)?.label || org.service_type;
  const useCases = Object.entries(org.use_cases || {}).filter(([, enabled]) => Boolean(enabled));
  return <div className="space-y-7 rounded-2xl border border-gray-100 bg-white p-5 sm:p-7">
          <div className="flex items-start gap-4 rounded-xl bg-brand-bg p-4 sm:p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><Building2 size={24} /></div>
            <div className="min-w-0 space-y-2">
              <h2 className="break-words text-xl font-semibold text-brand-dark font-sora">{org.organization_name || 'Organization'}</h2>
              <p className="text-sm text-gray-500 font-inter">{[serviceLabel, org.industry_type].filter(Boolean).join(' · ') || 'Organization profile'}</p>
              <div className="flex flex-wrap gap-2">
                <Status good={org.is_active}>{org.is_active ? 'Active' : 'Inactive'}</Status>
                <Status good={org.org_approved}>{org.org_approved ? 'Approved' : 'Not approved'}</Status>
                <Status good={org.gst_verified}>GST {org.gst_verified ? 'verified' : 'not verified'}</Status>
                <Status good={org.email_verified}>Email {org.email_verified ? 'verified' : 'not verified'}</Status>
                <Status good={org.onboarding_completed}>Onboarding {org.onboarding_completed ? 'completed' : 'pending'}</Status>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <Section title="Organization Information"><dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Organization Name" value={org.organization_name} /><Field label="Service Type" value={serviceLabel} />
              <Field label="Industry Type" value={org.industry_type} /><Field label="GSTIN" value={org.gstin} />
              <Field label="Business Registration Number" value={org.business_reg_number} />
            </dl></Section>
            <div className="min-w-0 space-y-6">
              <Section title="Registered Address"><p className="whitespace-pre-line break-words text-sm leading-relaxed text-brand-dark font-inter">{[org.address_line1, org.address_line2, org.address_line3].filter(Boolean).join('\n') || 'No registered address provided.'}</p></Section>
              <Section title="Use Cases"><div className="flex flex-wrap gap-2">{useCases.length ? useCases.map(([key]) => <span key={key} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-brand-blue font-inter">{useCaseLabels[key] || key}</span>) : <p className="text-sm text-gray-400 font-inter">No use cases configured.</p>}</div></Section>
            </div>
          </div>
          <Section title="Dhiway Configuration">
            {Array.isArray(org.dhiways_details) && org.dhiways_details.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {org.dhiways_details.map((row, index) => <div key={index} className="min-w-0 space-y-3 rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap gap-2 text-xs font-inter"><span className="capitalize text-gray-500">{row.space_type || 'Legacy'}</span>{row.default && <span className="text-brand-blue">Default</span>}</div>
                <dl className="space-y-3"><Field label="Space ID" value={row.space_id} /><Field label="Schema ID" value={row.schema_id} />{row.schema_variant && <Field label="Schema Variant" value={row.schema_variant} />}</dl>
              </div>)}
            </div> : <p className="text-sm text-gray-400 font-inter">No Dhiway spaces configured.</p>}
          </Section>
          <dl className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3"><Field label="Created At" value={dateTime(org.created_at)} /><Field label="Updated At" value={dateTime(org.updated_at)} /><Field label="Last Login" value={dateTime(org.last_login)} /></dl>
        </div>;
};
