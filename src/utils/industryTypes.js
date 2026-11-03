// Industry lists come from the backend, one per entity type (GET /verification/industry-types).
// The backend now rejects any industry that is not an active entry of the right list, so screens
// offer these names instead of free text. Until the backend is deployed (or if it is unreachable)
// the seeded lists below keep the Human and Organization flows working.

export const INDUSTRY_ENTITY = { HUMAN: 'human', PRODUCT: 'product', ORGANIZATION: 'organization' };

const named = (names) => names.map((name) => ({ id: industrySlug(name), backendId: null, name, isActive: true }));

export const industrySlug = (name = '') =>
  String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export const FALLBACK_INDUSTRIES = {
  human: named(['Healthcare', 'Transportation', 'Logistics', 'IT', 'Real Estate']),
  // "Electronics" alone is not a valid Product industry; the backend's name is below.
  product: named(['Electronics & Appliances', 'Beauty & Cosmetics']),
  organization: named([
    'Technology', 'Healthcare', 'Education', 'Finance & Banking',
    'Manufacturing', 'Retail & E-commerce', 'Construction',
    'Logistics & Transportation', 'Hospitality', 'Agriculture',
    'Energy & Utilities', 'Media & Entertainment', 'Legal & Compliance',
    'Non-Profit', 'Government', 'Other',
  ]),
};

// The list a verification type's tags must come from, by the type's `category`.
export const industryEntityForCategory = (category) => {
  const value = String(category || '').toLowerCase();
  if (value === 'human') return INDUSTRY_ENTITY.HUMAN;
  if (value === 'product' || value === 'warranty') return INDUSTRY_ENTITY.PRODUCT;
  return INDUSTRY_ENTITY.HUMAN;
};

// Normalises a list response. Returns null when the response is not usable as the requested list:
// a backend that predates the entity types ignores `entity_type` and returns the Product list for
// everything, and its rows carry no `entity_type`, so those rows must not be shown as e.g. Human.
export const parseIndustryTypes = (data, entityType, { includeInactive = false } = {}) => {
  if (!Array.isArray(data)) return null;
  if (data.length > 0 && !data.every((row) => row && row.entity_type === entityType)) return null;
  return data
    .filter((row) => row.name && (includeInactive || row.is_active !== false))
    .map((row) => ({
      id: industrySlug(row.name),
      backendId: row.id ?? null,
      name: row.name,
      isActive: row.is_active !== false,
      warrantySupport: row.warranty_support,
      updatedAt: row.updated_at,
    }));
};

// A saved value that is no longer in the list (renamed or deactivated) must stay selectable, so a
// form that resends it unchanged still saves. Only a *changed* value is checked by the backend.
export const withCurrentIndustry = (names, current) => {
  const list = [...names];
  const value = String(current ?? '').trim();
  if (value && !list.some((name) => name.toLowerCase() === value.toLowerCase())) list.push(value);
  return list;
};

export const industrySelectOptions = (names, current) =>
  withCurrentIndustry(names, current).map((name) => ({ value: name, label: name }));

// Industry tags arrive as a comma-separated string in forms and as a list from the API.
export const splitIndustryTags = (value) =>
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map((tag) => String(tag).trim())
    .filter(Boolean);

// Backend rule: names are 1-100 characters and may not contain a comma.
export const validateIndustryName = (value) => {
  const name = String(value ?? '').trim();
  if (!name) return 'Enter an industry name';
  if (name.length > 100) return 'Use 100 characters or fewer';
  if (name.includes(',')) return 'Commas are not allowed in an industry name';
  return '';
};
