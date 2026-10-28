export const humanEmailRequired = (permission) => !['public', 'open_search'].includes(String(permission || 'private').toLowerCase());

export const humanEmailError = (value, permission) => {
  const email = String(value ?? '').trim();
  if (!email) return humanEmailRequired(permission) ? 'Email is required for Permission Required verification.' : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Enter a valid email address.';
};

export const withHumanEmailField = (fields, permission) => {
  const email = { key: 'email', label: 'Email', aliases: ['email', 'email_address'], required: humanEmailRequired(permission) };
  return fields.some((field) => field.key === 'email')
    ? fields.map((field) => field.key === 'email' ? { ...field, ...email } : field)
    : [fields[0], email, ...fields.slice(1)].filter(Boolean);
};

export const validateHumanExcelEmails = (rows, permission) => {
  const headers = (rows[0] || []).map((value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
  const column = headers.findIndex((value) => value === 'email' || value.startsWith('email_'));
  if (column < 0) {
    if (humanEmailRequired(permission)) throw new Error('Email column is required for Permission Required verification.');
    return;
  }
  const invalid = [];
  rows.slice(1).forEach((row, index) => {
    if (Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()) && humanEmailError(row[column], permission)) invalid.push(index + 2);
  });
  if (invalid.length) throw new Error(`Enter a valid email in Excel row${invalid.length === 1 ? '' : 's'} ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? ` and ${invalid.length - 5} more` : ''}.${humanEmailRequired(permission) ? ' Email is required for every user in Permission Required verification.' : ''}`);
};

export const validateOcrDraftEmails = (draft, options = {}) => {
  if ((options.batchType || options.batch_type || 'human') !== 'human') return;
  const permission = options.credentialVisibility ?? options.credential_visibility;
  const invalid = (draft.records || []).flatMap((record, index) => humanEmailError(record.payload?.email, permission) ? [index + 1] : []);
  if (invalid.length) throw new Error(`Check Email for OCR user${invalid.length === 1 ? '' : 's'} ${invalid.join(', ')}.${humanEmailRequired(permission) ? ' A valid email is required before creating a Permission Required batch.' : ' Enter a valid email or leave it blank for Open Search.'}`);
};
