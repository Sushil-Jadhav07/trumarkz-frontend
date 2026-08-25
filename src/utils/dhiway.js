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
