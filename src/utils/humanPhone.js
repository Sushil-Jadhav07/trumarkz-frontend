const PHONE_ALIASES = ['phone_number', 'phone', 'mobile', 'mobile_number'];
const normalizeMode = (mode) => String(mode ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const resolveHumanPermission = (selected, organizationDefault) => {
  const mode = normalizeMode(selected) || normalizeMode(organizationDefault);
  return ['public', 'open', 'open_search'].includes(mode) ? 'public' : 'private';
};

export const humanPhoneRequired = (permission, batchType = 'human') =>
  batchType === 'human' && resolveHumanPermission(permission) === 'private';

export const normalizeHumanPhone = (value) => String(value ?? '').replace(/[\s.\-()[\]]/g, '');

export const humanPhoneError = (value, permission, batchType = 'human') => {
  if (batchType !== 'human') return '';
  if (!String(value ?? '').trim()) return humanPhoneRequired(permission) ? 'Phone Number is required for Permission Required Human batches.' : '';
  return /^\+?\d{10,15}$/.test(normalizeHumanPhone(value)) ? '' : 'Enter a valid Phone Number with 10–15 digits and an optional leading +.';
};

export class HumanPhoneValidationError extends Error {
  constructor(message) { super(message); this.name = 'HumanPhoneValidationError'; this.field = 'phone_number'; }
}

export const withHumanPhoneField = (fields, permission) => {
  const phone = { key: 'phone_number', label: 'Phone Number', aliases: PHONE_ALIASES, required: humanPhoneRequired(permission) };
  return fields.some((field) => field.key === 'phone_number')
    ? fields.map((field) => field.key === 'phone_number' ? { ...field, ...phone } : field)
    : [...fields.slice(0, 2), phone, ...fields.slice(2)];
};

const normalizeHeader = (value) => String(value ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');

export const validateHumanExcelPhones = (rows, permission, { phoneColumns = [], batchType = 'human' } = {}) => {
  if (batchType !== 'human') return;
  const headers = (rows[0] || []).map(normalizeHeader);
  const column = [...phoneColumns.map(normalizeHeader), ...PHONE_ALIASES]
    .map((name) => headers.findIndex((header) => header === name || header.startsWith(`${name}_`)))
    .find((index) => index >= 0);
  if (column === undefined) {
    if (humanPhoneRequired(permission)) throw new HumanPhoneValidationError('The phone_number column is required for Permission Required Human batches. You can also use phone, mobile or mobile_number.');
    return;
  }
  const invalid = [];
  rows.slice(1).forEach((row, index) => {
    if (Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()) && humanPhoneError(row[column], permission)) invalid.push(index + 2);
  });
  if (invalid.length) throw new HumanPhoneValidationError(`Check Phone Number in Excel row${invalid.length === 1 ? '' : 's'} ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? ` and ${invalid.length - 5} more` : ''}. ${humanPhoneRequired(permission) ? 'Every holder needs a valid mobile number. ' : ''}Use 10–15 digits, optionally starting with +.`);
};

export const validateOcrDraftPhones = (draft, options = {}) => {
  const type = options.batchType || options.batch_type || 'human';
  if (type !== 'human') return;
  const permission = options.credentialVisibility ?? options.credential_visibility;
  const invalid = (draft.records || []).flatMap((record, index) => humanPhoneError(record.payload?.phone_number, permission) ? [index + 1] : []);
  if (invalid.length) throw new HumanPhoneValidationError(`Check Phone Number for OCR user${invalid.length === 1 ? '' : 's'} ${invalid.join(', ')}. ${humanPhoneRequired(permission) ? 'A valid mobile number is required for every holder before creating this batch.' : 'Enter a valid mobile number or leave it blank for Open Human.'}`);
};

// Apply only on Human creation surfaces, never the existing credential-auth forms.
export const humanPhoneBackendMessage = (err) => {
  if (err instanceof HumanPhoneValidationError) return err.message;
  const data = err?.response?.data;
  const entries = Array.isArray(data?.detail) ? data.detail : Array.isArray(data?.errors) ? data.errors : [];
  const phoneErrors = entries.filter((entry) => PHONE_ALIASES.includes(entry?.field)
    || (Array.isArray(entry?.loc) && entry.loc.some((part) => PHONE_ALIASES.includes(part)))
    || /phone_number|phone number/i.test(entry?.msg || entry?.error || entry?.message || ''));
  if (phoneErrors.length) return phoneErrors.map((entry) => `Phone Number${entry.row != null ? ` (row ${entry.row})` : ''}: ${entry.msg || entry.error || entry.message || 'Enter a valid mobile number.'}`).join('; ').replace(/phone_number/g, 'Phone Number');
  const message = typeof data?.detail === 'string' ? data.detail : data?.message || '';
  return /phone_number|phone number/i.test(message) ? message.replace(/phone_number/g, 'Phone Number') : '';
};
