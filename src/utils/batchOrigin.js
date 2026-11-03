// Where the user was when they started a new batch (Dashboard, Batches, …), so Back on the first
// wizard step returns them there instead of a fixed page. Kept in sessionStorage so a reload
// mid-wizard still knows where to go back to.
const KEY = 'trumarkz_batch_origin';
export const DEFAULT_BATCH_ORIGIN = '/org/dashboard';

// Pages that belong to the new-batch wizard itself — never an origin.
const WIZARD_PATHS = [
  '/org/create-batch', '/org/industry', '/org/verifications', '/org/permissions',
  '/org/template', '/org/costing', '/org/certificate-preview',
];

export const isBatchWizardPath = (pathname = '') =>
  WIZARD_PATHS.includes(pathname) || pathname.startsWith('/org/product/');

const read = (storage) => { try { return storage.getItem(KEY); } catch { return null; } };
const write = (storage, value) => { try { storage.setItem(KEY, value); } catch { /* blocked storage: fall back to the default */ } };

// Called on every route change: remembers the last page that is not part of the wizard.
export const trackBatchOrigin = (pathname, storage = globalThis.sessionStorage) => {
  if (!storage || !pathname || isBatchWizardPath(pathname)) return;
  write(storage, pathname);
};

export const batchOrigin = (storage = globalThis.sessionStorage) => {
  const saved = storage ? read(storage) : null;
  return saved && saved.startsWith('/org/') && !isBatchWizardPath(saved) ? saved : DEFAULT_BATCH_ORIGIN;
};
