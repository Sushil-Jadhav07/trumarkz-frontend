import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw, AlertTriangle } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { OrganizationDetails } from '@/components/shared/OrganizationDetails';
import { OrganizationEditor } from '@/components/shared/OrganizationEditor';
import { adminAPI, getApiError } from '@/services/api';

export default function OrganizationDetail({ edit = false }) {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const detailsPath = `/admin/organizations/${encodeURIComponent(orgId)}`;

  useEffect(() => {
    if (edit) return;
    let active = true;
    setOrg(null);
    setLoading(true);
    setError(null);
    adminAPI.getOrganization(orgId)
      .then(({ data }) => { if (active) setOrg(data); })
      .catch((err) => {
        if (active) setError(err?.response?.status === 404 ? 'Organization could not be found.' : getApiError(err, 'Failed to load organization'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, edit, retry]);

  return <AuthLayout title={edit ? 'Edit Organization' : 'Organization Details'}>
    <Link to={edit ? detailsPath : '/admin/organizations'} className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 font-inter hover:text-brand-blue">
      <ArrowLeft size={16} /> {edit ? 'Back to organization' : 'Back to organizations'}
    </Link>
    <PageHeader title={edit ? 'Edit Organization' : 'Organization Details'}
      subtitle={edit ? 'Update organization information and verification configuration.' : 'Organization profile, verification status, and configuration.'}
      action={!edit && org && !loading && !error ? <Link to={`${detailsPath}/edit`} className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white font-inter hover:bg-blue-700"><Pencil size={14} /> Edit Organization</Link> : null} />
    {edit ? <OrganizationEditor key={orgId} orgId={orgId}
      onClose={() => navigate(detailsPath)} onSuccess={() => navigate(detailsPath, { replace: true })} />
      : loading ? <LoadingSkeleton variant="detail" label="Loading organization" className="rounded-2xl bg-white p-5 sm:p-7" />
        : error ? <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-20 text-center font-inter"><AlertTriangle className="text-red-400" /><p className="text-sm text-gray-500">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="text-sm text-brand-blue hover:underline">Try again</button></div>
          : org ? <OrganizationDetails org={org} /> : null}
  </AuthLayout>;
}
