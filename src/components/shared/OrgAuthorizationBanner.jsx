import { AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { authorizationDisplay, authorizationsByHolder, holderKey, holderName } from '@/utils/partialSdc';

const when = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
};

// SuperAdmin batch page: the organization has already authorized a partial SDC for some holders who are not fully
// verified. Lists who, with exactly which verifications the credential will carry, and flags authorizations whose
// results changed (the organization must authorize those again). Hidden when nothing is open.
export const OrgAuthorizationBanner = ({ authorizations = [], records = [], onGenerate, className = '' }) => {
  const byHolder = authorizationsByHolder(authorizations);
  const names = Object.fromEntries(records.map((r) => [holderKey(r), holderName(r)]));
  const rows = Object.values(byHolder)
    .map((auth) => ({ auth, view: authorizationDisplay(auth) }))
    .filter(({ view }) => view && ['authorized', 'outdated', 'generating'].includes(view.kind));
  if (rows.length === 0) return null;

  const ready = rows.filter(({ view }) => view.kind === 'authorized');
  const outdated = rows.filter(({ view }) => view.kind === 'outdated');

  return (
    <section aria-label="Organization authorization" className={`rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><ShieldCheck size={19} /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-dark font-inter">
              The organization has authorized a partial SDC for {ready.length || rows.length} holder{(ready.length || rows.length) === 1 ? '' : 's'}
            </p>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-gray-600 font-inter">
              These holders are not fully verified. The organization approved a credential that carries only the verifications listed below.
              Their SDC can be generated now; nothing else is included.
            </p>
          </div>
        </div>
        {ready.length > 0 && onGenerate && (
          <button type="button" onClick={onGenerate} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand-blue px-3.5 text-xs font-semibold text-white hover:bg-brand-blue-hover font-inter">
            <Sparkles size={14} /> Generate SDC
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-white">
        {rows.map(({ auth, view }) => (
          <li key={auth.id || auth.batch_user_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-dark font-inter">{names[auth.batch_user_id] || auth.holder_name || auth.batch_user_id}</p>
              {view.kind === 'outdated' ? (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-amber-700 font-inter">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  Results changed since the organization authorized{view.stale.length ? ` (${view.stale.join(', ')})` : ''}. The organization must authorize this holder again.
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-gray-500 font-inter">
                  {view.kind === 'generating' ? 'An SDC is being generated for this holder.' : `Authorized${when(auth.created_at) ? ` ${when(auth.created_at)}` : ''}`}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {view.types.map((type) => (
                <span key={type} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium font-inter ${view.stale.includes(type) ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>{type}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {outdated.length > 0 && ready.length > 0 && (
        <p className="mt-2 text-[11px] text-amber-700 font-inter">{outdated.length} authorization{outdated.length === 1 ? ' is' : 's are'} outdated and can’t be used until the organization authorizes again.</p>
      )}
    </section>
  );
};

export default OrgAuthorizationBanner;
