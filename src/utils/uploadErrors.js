// One line per rejected upload item. Spreadsheet rows come back as {row, error, data},
// OCR documents as {file, error, extracted}, older responses as {row, field, error} or
// {row, reason}; a schema error has no `field`, so nothing is assumed beyond what's present.
export const uploadErrorText = (item) => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return 'Unknown error';
  const where = item.row !== undefined && item.row !== null ? `Row ${item.row}` : (item.file || item.filename || '');
  const what = item.error || item.reason || item.message || item.detail || 'Rejected';
  const field = item.field ? `${item.field}: ` : '';
  return where ? `${where} — ${field}${what}` : `${field}${what}`;
};
