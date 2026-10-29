import { discoverRecordFields } from './jsonRecord.js';

// Constants for the dynamic organization-specific schema system
// (org_schema_configs) — see "Dynamic Schema change.md" §G. Kept in sync
// with the backend's own INPUT_SEMANTIC_FIELDS; these are the only keys
// input_map/output_map may reference for a given space_type.
export const SCHEMA_SPACE_TYPE_OPTIONS = [
  { value: 'human', label: 'Human' },
  { value: 'product', label: 'Product' },
  { value: 'warranty', label: 'Warranty' },
];

// Note: "warrenty_period" is the backend's real field name (a long-confirmed
// typo in the live API, not a mistake here) — never "correct" it to
// "warranty_period" or input_map/output_map entries will silently never match.
export const SCHEMA_SEMANTIC_FIELDS = {
  human: ['full_name', 'email', 'phone_number', 'dob', 'dl_number', 'nationality'],
  product: ['product_name', 'model_no', 'brand', 'sku_no'],
  warranty: ['product_name', 'model_no', 'brand', 'manufactured_by', 'manufactured_date', 'warrenty_period', 'coverage', 'product_details'],
};

export const SCHEMA_LOCAL_FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'email', 'phone'];

// input_map/output_map are kept as {key, value} ROW ARRAYS throughout the
// form state (matching mapToRows' output below) — never the {semantic:
// value} dict shape the API actually sends/returns. The panel component
// calls .map()/spreads these as arrays on every render regardless of
// whether the modal is open (they're JSX children, evaluated eagerly), so
// starting them as `{}` here crashed the whole page on first mount.
// Human configs are always the 5-QR layout; the legacy variant is no longer offered.
export const HUMAN_SCHEMA_VARIANT = 'human_5qr';

export const emptySchemaConfigForm = (spaceType = 'human') => ({
  space_type: spaceType,
  schema_variant: spaceType === 'human' ? HUMAN_SCHEMA_VARIANT : '',
  schema_id: '',
  space_id: '',
  label: '',
  local_fields: [],
  input_map: [],
  output_map: [],
  is_default: false,
});

// local_fields as an array of rows (UI-friendly) <-> the {name, type,
// required, description, aliases} objects the API expects.
export const newLocalFieldRow = () => ({ name: '', type: 'string', required: false, description: '', aliasesText: '' });

export const localFieldRowToPayload = (row) => {
  const description = (row.description || '').trim();
  return {
    name: (row.name || '').trim(),
    type: row.type || 'string',
    required: !!row.required,
    ...(description ? { description } : {}),
    aliases: (row.aliasesText || '').split(',').map((a) => a.trim()).filter(Boolean),
  };
};

export const localFieldToRow = (field) => ({
  name: field?.name || '',
  type: field?.type || 'string',
  required: !!field?.required,
  description: field?.description || '',
  aliasesText: Array.isArray(field?.aliases) ? field.aliases.join(', ') : '',
});

// Maps arrive either as the API's {semantic: value} dict or as [{key, value}] rows.
const jsonMapToRows = (value, label, errors) => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({ key: String(r.key ?? ''), value: String(r.value ?? '') }));
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, v]) => ({ key, value: v == null ? '' : String(v) }));
  }
  errors.push(`"${label}" must be an object like {"full_name": "Name"}`);
  return [];
};

// Fills the form from a pasted config JSON (the same shape the API takes and returns).
// Keys that are absent keep their current form value; space_type is locked while editing.
export const schemaConfigJsonToForm = (text, currentForm, { lockSpaceType = false } = {}) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { errors: [`Not valid JSON: ${err.message}`] };
  }
  const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.config && typeof parsed.config === 'object'
    ? parsed.config
    : parsed;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { errors: ['Paste a single JSON object, e.g. {"space_type": "human", "schema_id": "…", …}'] };
  }

  const errors = [];
  const form = { ...currentForm };
  const has = (key) => Object.prototype.hasOwnProperty.call(source, key);

  if (has('space_type')) {
    const type = String(source.space_type).trim().toLowerCase();
    if (!SCHEMA_SPACE_TYPE_OPTIONS.some((o) => o.value === type)) {
      errors.push(`"space_type" must be one of: ${SCHEMA_SPACE_TYPE_OPTIONS.map((o) => o.value).join(', ')}`);
    } else if (lockSpaceType && type !== currentForm.space_type) {
      errors.push(`This configuration is "${currentForm.space_type}" — the entity type cannot be changed when saving a new version`);
    } else {
      form.space_type = type;
    }
  }

  ['schema_id', 'space_id', 'label'].forEach((key) => {
    if (has(key)) form[key] = source[key] == null ? '' : String(source[key]).trim();
  });

  if (has('local_fields')) {
    if (Array.isArray(source.local_fields)) {
      const fields = source.local_fields
        .map((f) => (typeof f === 'string' ? { name: f } : f))
        .filter((f) => f && typeof f === 'object');
      fields.forEach((f, i) => {
        if (!String(f.name ?? '').trim()) errors.push(`local_fields[${i}] needs a "name"`);
        if (f.type != null && !SCHEMA_LOCAL_FIELD_TYPES.includes(f.type)) {
          errors.push(`local_fields[${i}] "type" must be one of: ${SCHEMA_LOCAL_FIELD_TYPES.join(', ')} (got "${f.type}")`);
        }
      });
      form.local_fields = fields.map(localFieldToRow);
    } else {
      errors.push('"local_fields" must be an array');
    }
  }
  if (has('input_map')) form.input_map = jsonMapToRows(source.input_map, 'input_map', errors);
  if (has('output_map')) form.output_map = jsonMapToRows(source.output_map, 'output_map', errors);
  if (has('is_default')) form.is_default = source.is_default === true;

  form.schema_variant = form.space_type === 'human' ? HUMAN_SCHEMA_VARIANT : '';
  return errors.length ? { errors } : { form };
};

// The fields the backend names in its advisory save warnings when they have no input mapping.
// A config without them still saves (SchemaConfigSaveResponse: "a structurally valid configuration
// can always be saved"); only the upload that needs the field fails later, with its own error.
export const RECOMMENDED_INPUT_FIELDS = {
  human: ['full_name', 'email', 'dob'],
};

const mappedInputKeys = (form) =>
  (form.input_map || []).filter((r) => (r.key || '').trim() && (r.value || '').trim()).map((r) => r.key.trim());

// Only what the backend itself rejects with a 400 blocks the save.
export const schemaConfigBlockingErrors = (form) => {
  const allowed = SCHEMA_SEMANTIC_FIELDS[form.space_type] || [];
  const unknown = mappedInputKeys(form).filter((k) => !allowed.includes(k));
  return unknown.length
    ? [`input_map has ${unknown.map((k) => `"${k}"`).join(', ')}, which ${unknown.length === 1 ? 'is not a' : 'are not'} ${form.space_type} field${unknown.length === 1 ? '' : 's'} — the API accepts only: ${allowed.join(', ')}`]
    : [];
};

export const schemaConfigMappingWarnings = (form) => {
  const mapped = new Set(mappedInputKeys(form));
  const missing = (RECOMMENDED_INPUT_FIELDS[form.space_type] || []).filter((f) => !mapped.has(f));
  return missing.map((f) => `No input mapping for "${f}" — uploads that need it will be stopped with an error until it is mapped.`);
};

// Pasting a configuration (or an API response) still works: an object made only of configuration
// keys, carrying at least one mapping key, is read as configuration. Anything else is a sample record.
const CONFIG_KEYS = new Set([
  'config', 'space_type', 'schema_variant', 'schema_id', 'space_id', 'label', 'local_fields', 'input_map', 'output_map',
  'is_default', 'id', 'org_id', 'version', 'is_active', 'previous_version_id', 'created_by', 'created_by_role',
  'created_at', 'updated_at', 'warnings',
]);
const CONFIG_MARKERS = ['config', 'local_fields', 'input_map', 'output_map'];

export const classifyJsonBox = (text) => {
  if (!text.trim()) return { kind: 'empty' };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { kind: 'invalid', error: `Not valid JSON: ${err.message}` };
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const keys = Object.keys(parsed);
    if (keys.length && keys.every((k) => CONFIG_KEYS.has(k)) && CONFIG_MARKERS.some((k) => keys.includes(k))) {
      return { kind: 'config' };
    }
  }
  const discovery = discoverRecordFields(text);
  return discovery.error ? { kind: 'invalid', error: discovery.error } : { kind: 'sample', discovery };
};

const EXAMPLE_RECORDS = {
  human: {
    'Employee Name': 'Arjun Mehra',
    'Work Email': 'arjun.m@example.com',
    'Date of Birth': '1994-03-12',
    'Phone No.': '+91 98765 43210',
    contact: { city: 'Mumbai', pin: '400053' },
    skills: ['Forklift', 'Inventory'],
    reference: null,
  },
  product: {
    'Item Name': 'Frosta Cool 420',
    'Item SKU': 'RFC420X2024',
    Brand: 'Frosta Home',
    specs: { capacity_l: 420, energy_rating: 5 },
  },
  warranty: {
    'Item Name': 'Frosta Cool 420',
    'Model': 'RFC420X2024',
    'Warranty (months)': 24,
    purchase: { date: '2024-05-20', store: 'Andheri West' },
  },
};

export const exampleRecordJson = (spaceType) =>
  JSON.stringify(EXAMPLE_RECORDS[spaceType] || EXAMPLE_RECORDS.human, null, 2);

// Exactly the SchemaConfigUpsertRequest fields from the live OpenAPI contract — nothing else is sent.
export const buildSchemaConfigPayload = (form) => {
  const payload = {
    space_type: form.space_type,
    schema_id: form.schema_id.trim(),
    space_id: form.space_id.trim(),
    label: form.label.trim(),
    local_fields: (form.local_fields || []).map(localFieldRowToPayload).filter((f) => f.name),
    input_map: rowsToMap(form.input_map),
    output_map: rowsToMap(form.output_map),
    is_default: !!form.is_default,
  };
  if (form.space_type === 'human') payload.schema_variant = HUMAN_SCHEMA_VARIANT;
  return payload;
};

// A SchemaConfigResponse loaded into the form for "Save New Version". Everything the API returned
// is carried over, so a new version never drops mappings the user didn't touch.
export const configToForm = (config) => ({
  space_type: config.space_type,
  schema_variant: config.space_type === 'human' ? HUMAN_SCHEMA_VARIANT : '',
  schema_id: config.schema_id || '',
  space_id: config.space_id || '',
  label: config.label || '',
  local_fields: (config.local_fields || []).map(localFieldToRow),
  input_map: mapToRows(config.input_map),
  output_map: mapToRows(config.output_map),
  is_default: !!config.is_default,
});

// Sets (or clears, with '') the source field for one semantic field, keeping every other row.
export const setInputMapping = (rows, semantic, source) => {
  const rest = (rows || []).filter((r) => (r.key || '').trim() !== semantic);
  return source === '' ? rest : [...rest, { key: semantic, value: source }];
};

// Mirrors the backend rule: within an org and space_type, two ACTIVE configs can't share a label
// (case-insensitive). A new version keeping its own label is not a duplicate.
export const duplicateLabelError = (label, spaceType, configs, editingId) => {
  const wanted = (label || '').trim().toLowerCase();
  if (!wanted) return '';
  const clash = (configs || []).find(
    (c) => c.is_active && c.space_type === spaceType && c.id !== editingId && (c.label || '').trim().toLowerCase() === wanted,
  );
  return clash ? `An active '${spaceType}' schema named '${clash.label}' already exists for this organization.` : '';
};

// {semantic: value} dict <-> array of {key, value} rows for an editable list UI.
export const mapToRows = (map) => Object.entries(map || {}).map(([key, value]) => ({ key, value }));
// Values are kept byte-for-byte: a source field named " Emp Name " is a different field from
// "Emp Name", so trimming it would silently point the mapping at the wrong column.
export const rowsToMap = (rows) =>
  Object.fromEntries(
    (rows || [])
      .map((r) => [(r.key || '').trim(), r.value == null ? '' : String(r.value)])
      .filter(([key, value]) => key && value.trim())
  );
