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

// input_map/output_map are kept as {key, value} ROW ARRAYS throughout the
// form state (matching mapToRows' output below) — never the {semantic:
// value} dict shape the API actually sends/returns. The panel component
// calls .map()/spreads these as arrays on every render regardless of
// whether the modal is open (they're JSX children, evaluated eagerly), so
// starting them as `{}` here crashed the whole page on first mount.
// Human configs are always the 5-QR layout; the legacy variant is no longer offered.
export const HUMAN_SCHEMA_VARIANT = 'human_5qr';

// The backend keeps the full nested schema record under this reserved custom_fields key.
// It is never shown or edited as a flat field, and never sent back on a PATCH.
export const RESERVED_CUSTOM_FIELD_KEYS = new Set(['__schema_record__']);

export const visibleCustomFields = (customFields) => (
  customFields && typeof customFields === 'object' && !Array.isArray(customFields)
    ? Object.fromEntries(Object.entries(customFields).filter(([key]) => !RESERVED_CUSTOM_FIELD_KEYS.has(key)))
    : {}
);

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

// local_fields as an array of rows (UI-friendly) <-> the LocalFieldDefinition objects the API expects.
// `path` and `nullable` come from the server's sample_record discovery and are carried through
// untouched, so re-saving a config as a new version never drops them.
export const localFieldRowToPayload = (row) => {
  const description = (row.description || '').trim();
  return {
    name: (row.name || '').trim(),
    type: row.type || 'string',
    required: !!row.required,
    ...(description ? { description } : {}),
    aliases: (row.aliasesText || '').split(',').map((a) => a.trim()).filter(Boolean),
    ...(Array.isArray(row.path) ? { path: row.path } : {}),
    ...(typeof row.nullable === 'boolean' ? { nullable: row.nullable } : {}),
  };
};

export const localFieldToRow = (field) => ({
  name: field?.name || '',
  type: field?.type || 'string',
  required: !!field?.required,
  description: field?.description || '',
  aliasesText: Array.isArray(field?.aliases) ? field.aliases.join(', ') : '',
  path: Array.isArray(field?.path) ? field.path : null,
  nullable: typeof field?.nullable === 'boolean' ? field.nullable : null,
});

// A server path segment of null stands for "any element of this array".
export const formatServerPath = (path) =>
  Array.isArray(path) && path.length
    ? path.map((s) => (s === null ? '[]' : s)).join('.').replace(/\.\[\]/g, '[]')
    : '';

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
      // Only "name" is required by LocalFieldDefinition. Types are left to the server, which now
      // generates its own (typed from observed JSON values) — a local list would reject those.
      fields.forEach((f, i) => {
        if (!String(f.name ?? '').trim()) errors.push(`local_fields[${i}] needs a "name"`);
        if (f.type != null && typeof f.type !== 'string') errors.push(`local_fields[${i}] "type" must be a string`);
      });
      form.local_fields = fields.map(localFieldToRow);
    } else {
      errors.push('"local_fields" must be an array');
    }
  }
  if (has('input_map')) form.input_map = jsonMapToRows(source.input_map, 'input_map', errors);
  if (has('output_map')) form.output_map = jsonMapToRows(source.output_map, 'output_map', errors);
  if (has('is_default')) form.is_default = source.is_default === true;

  // A sample_record inside a pasted request body goes back into the box, to be sent as the record.
  let sampleText = '';
  if (has('sample_record') && source.sample_record != null) {
    if (typeof source.sample_record === 'object' && !Array.isArray(source.sample_record)) {
      sampleText = JSON.stringify(source.sample_record, null, 2);
    } else {
      errors.push('"sample_record" must be a JSON object');
    }
  }

  form.schema_variant = form.space_type === 'human' ? HUMAN_SCHEMA_VARIANT : '';
  return errors.length ? { errors } : { form, sampleText };
};

// The frontend makes no rules of its own about which fields or mapping keys are allowed or needed:
// the server validates the configuration and returns its own 400/422 errors, shown verbatim, plus
// advisory `warnings`. Duplicating those rules here is how stale "required" errors crept in.

// The server adds an identity input_map entry for every top-level sample key that exactly matches a
// semantic field (per the sample_record contract), so those count as mapped in the preview too.
export const autoMatchedFields = (spaceType, discovery) => {
  if (!discovery) return [];
  const topLevel = new Set(discovery.fields.filter((f) => f.depth === 1).map((f) => f.segments[0]));
  return (SCHEMA_SEMANTIC_FIELDS[spaceType] || []).filter((f) => topLevel.has(f));
};

// Pasting a configuration (or an API response) still works: an object made only of configuration
// keys, carrying at least one mapping key, is read as configuration. Anything else is a sample record.
const CONFIG_KEYS = new Set([
  'config', 'space_type', 'schema_variant', 'schema_id', 'space_id', 'label', 'local_fields', 'input_map', 'output_map',
  'is_default', 'sample_record', 'id', 'org_id', 'version', 'is_active', 'previous_version_id', 'created_by',
  'created_by_role', 'created_at', 'updated_at', 'warnings',
]);
// A whole request body pasted back in (it carries sample_record) is configuration too — otherwise it
// would be sent as a record and the server would make fields called "space_type", "label", …
const CONFIG_MARKERS = ['config', 'local_fields', 'input_map', 'output_map', 'sample_record'];

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
  // sample_record is "any ordinary JSON object" — a list of records has no single field set to send.
  if (Array.isArray(parsed)) {
    return { kind: 'invalid', error: 'Paste one record object, not an array — e.g. {"name": "…", "email": "…"}' };
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
// With a sample record, local_fields are left for the server to derive from it ("one per discovered
// path, typed from the observed JSON values"); sending the old list alongside could duplicate them.
export const buildSchemaConfigPayload = (form, { withSampleRecord = false } = {}) => {
  const payload = {
    space_type: form.space_type,
    schema_id: form.schema_id.trim(),
    space_id: form.space_id.trim(),
    label: form.label.trim(),
    local_fields: withSampleRecord ? [] : (form.local_fields || []).map(localFieldRowToPayload).filter((f) => f.name),
    input_map: rowsToMap(form.input_map),
    output_map: rowsToMap(form.output_map),
    is_default: !!form.is_default,
  };
  if (form.space_type === 'human') payload.schema_variant = HUMAN_SCHEMA_VARIANT;
  // The server treats an absent local_fields as "keep the previous version's" and an explicit []
  // as "clear them". With a sample the fields come from it, so the key is left out entirely.
  if (withSampleRecord) delete payload.local_fields;
  return payload;
};

// Adds the pasted text as sample_record verbatim. Re-serialising it through JSON.parse/stringify
// would move integer-like keys ("10", "2") ahead of the rest, so the server would discover the
// record's fields in a different order than the user wrote them.
export const withSampleRecord = (bodyJson, sampleText) => {
  const raw = sampleText.trim();
  JSON.parse(raw); // never splice anything that isn't valid JSON
  return bodyJson === '{}' ? `{"sample_record":${raw}}` : `${bodyJson.slice(0, -1)},"sample_record":${raw}}`;
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

// A record with no fields at all ({}) has nothing for the server to discover. Sending it would still
// make the server re-derive local_fields — from nothing — and wipe an edited config's existing fields.
export const sampleToSend = (box) => box.kind === 'sample' && box.discovery.fields.length > 0;

// Rows in the mapping grid: the known fields for this entity type, then every other key already in
// input_map (from a pasted config or the server), so nothing that is sent stays invisible.
export const mappingRowKeys = (spaceType, inputRows) => {
  const known = SCHEMA_SEMANTIC_FIELDS[spaceType] || [];
  return [...known, ...Object.keys(rowsToMap(inputRows)).filter((k) => !known.includes(k))];
};

// Source fields offered for a mapping. With a sample: its top-level plain-value keys. Without one:
// the field names the server already stored for this config, exactly as returned — top-level only,
// the same rule as the preview, since a mapping holds one source field name.
export const mappingSources = (discovery, savedFields) => {
  if (discovery) return discovery.mappableKeys;
  const names = (savedFields || [])
    .filter((f) => !Array.isArray(f.path) || f.path.length <= 1)
    .map((f) => f.name)
    .filter((n) => n && n.trim());
  return [...new Set(names)];
};

// Same idea as the backend's normalize_header: case, surrounding space and separators don't matter.
export const normalizeColumnName = (value) =>
  String(value ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');

// For each mapped semantic field, the upload column names that feed it under this schema: its
// input_map source, plus the aliases of the local field behind that source (or named after the
// semantic field itself). Normalised, so they compare with normalizeColumnName(header).
export const schemaSourceColumns = (config) => {
  const out = {};
  if (!config) return out;
  const fields = Array.isArray(config.local_fields) ? config.local_fields : [];
  Object.entries(config.input_map || {}).forEach(([semantic, source]) => {
    const names = new Set([normalizeColumnName(source)]);
    fields
      .filter((f) => f && (f.name === source || f.name === semantic))
      .forEach((f) => (Array.isArray(f.aliases) ? f.aliases : []).forEach((a) => names.add(normalizeColumnName(a))));
    out[semantic] = [...names].filter(Boolean);
  });
  return out;
};

// Required columns an upload is missing. Without a schema this is the exact-name check (with the
// optional "dob_yyyy_mm_dd" style prefix match). With a schema, a column also counts when it is the
// schema's mapped source or alias for that field — the backend applies that mapping before its own
// required-column check, so rejecting those here would block a file the server accepts.
export const missingRequiredColumns = (headerRow, required, config, { prefixOk = false } = {}) => {
  const headers = (Array.isArray(headerRow) ? headerRow : []).map(normalizeColumnName).filter(Boolean);
  const sources = schemaSourceColumns(config);
  return (required || []).filter((field) => {
    const canonical = normalizeColumnName(field);
    const direct = headers.some((h) => h === canonical || (prefixOk && h.startsWith(`${canonical}_`)));
    return !direct && !(sources[field] || []).some((name) => headers.includes(name));
  });
};

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
