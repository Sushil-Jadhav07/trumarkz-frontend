import { humanConsentMeta, formatConsentDeadline } from '@/utils/consent';

export const ConsentBadge = ({ record, showDeadline = false }) => {
  const meta = humanConsentMeta(record);
  if (!meta) return null;
  return <span className="inline-flex flex-wrap items-center gap-2">
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold font-inter ${meta.tone}`} title={record.consent_deadline ? `Consent deadline: ${formatConsentDeadline(record.consent_deadline)}` : undefined}>{meta.label}</span>
    {showDeadline && record.consent_deadline && <span className="text-xs text-gray-500 font-inter">Deadline: {formatConsentDeadline(record.consent_deadline)}</span>}
  </span>;
};
