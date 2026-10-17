// The existing batches API returns grouped organizations for Super Admins
// and can also return a flat batch list.
export const emailRecipientBatchOptions = (data) => {
  const list = Array.isArray(data) ? data : (data?.batches || data?.items || []);
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.flatMap((entry) => Array.isArray(entry?.batches)
    ? entry.batches.map((batch) => ({ ...batch, organization_name: batch.organization_name || entry.organization_name }))
    : [entry]
  ).flatMap((batch) => {
    const id = batch?.batch_id || batch?.id;
    if (!id || seen.has(String(id))) return [];
    seen.add(String(id));
    const name = batch.batch_name || batch.name || 'Unnamed batch';
    const organization = batch.organization_name || batch.org_name;
    return [{ value: String(id), label: organization ? `${name} · ${organization}` : name }];
  });
};

export const recipientReportUrl = (value) => {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  return /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) ? url : null;
};
