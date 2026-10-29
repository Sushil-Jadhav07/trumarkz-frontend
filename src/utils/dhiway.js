const VALID_SPACE_TYPES = ['human', 'product', 'warranty'];

export const DHIWAY_SPACE_TYPE_OPTIONS = [
  { value: '', label: 'Legacy / Human' },
  { value: 'human', label: 'Human' },
  { value: 'product', label: 'Product' },
  { value: 'warranty', label: 'Warranty' },
];

export const normalizeDhiwaySpaceType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_SPACE_TYPES.includes(normalized) ? normalized : '';
};

export const getDhiwaySpaceTypeLabel = (value) =>
  DHIWAY_SPACE_TYPE_OPTIONS.find((option) => option.value === normalizeDhiwaySpaceType(value))?.label ||
  DHIWAY_SPACE_TYPE_OPTIONS[0].label;

export const normalizeDhiwayDetail = (row = {}) => {
  const space_id = String(row.space_id || '').trim();
  const schema_id = String(row.schema_id || '').trim();
  const space_type = normalizeDhiwaySpaceType(row.space_type);

  const normalized = {
    space_id,
    schema_id,
    default: !!row.default,
  };

  if (space_type) normalized.space_type = space_type;
  return normalized;
};

export const normalizeDhiwayDetails = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map(normalizeDhiwayDetail);

export const resolveDhiwayDetailForType = (rows = [], requestedType = 'human') => {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (list.length === 0) return null;

  const normalizedType = normalizeDhiwaySpaceType(requestedType);
  const typedRows = normalizedType
    ? list.filter((row) => normalizeDhiwaySpaceType(row.space_type) === normalizedType)
    : [];

  if (typedRows.some((row) => row.default)) {
    return typedRows.find((row) => row.default) || typedRows[0] || null;
  }

  if (typedRows.length > 0) {
    return typedRows[0];
  }

  if (normalizedType === 'human') {
    const legacyRows = list.filter((row) => !normalizeDhiwaySpaceType(row.space_type));
    if (legacyRows.some((row) => row.default)) {
      return legacyRows.find((row) => row.default) || legacyRows[0] || null;
    }
    if (legacyRows.length > 0) {
      return legacyRows[0];
    }
  }

  if (list.some((row) => row.default)) {
    return list.find((row) => row.default) || list[0] || null;
  }

  return list[0] || null;
};

export const resolveDhiwaySpaceId = (rows = [], requestedType = 'human') =>
  resolveDhiwayDetailForType(rows, requestedType)?.space_id || '';

// Brings every active Schema Configuration's space/schema into the org's Dhiway Spaces list
// (dhiways_details), so both lists agree. Rows already present — same space_id, schema_id and
// space_type — are left alone, so nothing is ever duplicated. A config marked default becomes the
// default row for its own space_type; a newly added row is otherwise default only if its type had
// no row yet. Returns the updated rows and whether anything changed.
export const mergeSchemaConfigSpaces = (rows = [], configs = []) => {
  const next = normalizeDhiwayDetails(rows).map((r) => ({ ...r }));
  let changed = false;
  const sameRow = (r, c) =>
    r.space_id === c.space_id && r.schema_id === c.schema_id && normalizeDhiwaySpaceType(r.space_type) === c.space_type;

  (Array.isArray(configs) ? configs : [])
    .filter((c) => c && c.is_active !== false && String(c.space_id || '').trim() && String(c.schema_id || '').trim())
    .map((c) => ({
      space_id: String(c.space_id).trim(),
      schema_id: String(c.schema_id).trim(),
      space_type: normalizeDhiwaySpaceType(c.space_type),
      is_default: !!c.is_default,
    }))
    .filter((c) => c.space_type)
    .forEach((c) => {
      const ofType = next.filter((r) => normalizeDhiwaySpaceType(r.space_type) === c.space_type);
      let row = next.find((r) => sameRow(r, c));
      if (!row) {
        row = { space_id: c.space_id, schema_id: c.schema_id, space_type: c.space_type, default: ofType.length === 0 };
        next.push(row);
        changed = true;
      }
      if (c.is_default && !row.default) {
        ofType.forEach((r) => { r.default = false; });
        row.default = true;
        changed = true;
      }
    });

  return { rows: next, changed };
};

// The Dhiway space a batch's certificates actually live in, from the batch's own
// verification_progress.sdc: the space recorded when SDCs were generated, else the space of the
// schema configuration frozen onto the batch at creation (sdc.resolved_template), and only then
// `fallback` — the org's legacy Dhiway Spaces list. An org set up only through Schema
// Configurations has no legacy row, so falling back first would search the wrong space.
export const batchSdcSpaceId = (sdcInfo, fallback = '') =>
  String(sdcInfo?.space_id || sdcInfo?.resolved_template?.space_id || fallback || '').trim();
