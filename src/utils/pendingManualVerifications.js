const finishedStatuses = new Set(['approved', 'verified', 'completed', 'verification_completed', 'rejected', 'failed']);
const typeKey = (value) => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');

// Use the individual check, never the record's aggregate status or report URL.
// An absent check does not mean this user needs that verification type.
export const pendingManualUsers = (records, verificationType) => {
  const seen = new Set();
  return (Array.isArray(records) ? records : []).filter((record) => {
    const id = record.id || record.user_id || record.entity_id;
    if (!id || seen.has(id)) return false;
    const check = Object.entries(record.verification_type_status || {}).find(([name]) => typeKey(name) === typeKey(verificationType));
    if (!check) return false;
    const value = check[1];
    const status = String(typeof value === 'string' ? value : value?.status || '').trim().toLowerCase();
    if (finishedStatuses.has(status)) return false;
    seen.add(id);
    return true;
  }).map((record) => ({
    id: record.id || record.user_id || record.entity_id,
    name: record.full_name || record.product_name || record.email || record.id || record.user_id || record.entity_id,
  }));
};
