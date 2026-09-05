export const PRODUCT_VERIFICATION_STEPS = [
  'Sector',
  'Service',
  'Verifications',
  'Template',
  'Costing',
  'Batch',
];

export const PRODUCT_VERIFICATION_STEP_ROUTES = [
  '/org/product/sector',
  '/org/product/service',
  '/org/product/verifications',
  '/org/product/template',
  '/org/product/costing',
  '/org/batch-status',
];

export const PRODUCT_VERIFICATION_STEP_META = {
  sector:        { currentStep: 0, label: 'Step 1 of 6', progress: 16.67 },
  service:       { currentStep: 1, label: 'Step 2 of 6', progress: 33.33 },
  verifications: { currentStep: 2, label: 'Step 3 of 6', progress: 50 },
  template:      { currentStep: 3, label: 'Step 4 of 6', progress: 66.67 },
  costing:       { currentStep: 4, label: 'Step 5 of 6', progress: 83.33 },
  batch:         { currentStep: 5, label: 'Step 6 of 6', progress: 100 },
};

// Warranty batches skip "Verifications" entirely (no verification-type
// selection concept for warranty — see SelectProductService's routing).
// StepWizard marks every step before `currentStep` as completed, so reusing
// the 6-step product arrays here would wrongly show "Verifications" with a
// checkmark despite it never being visited. This 5-step variant drops it.
export const WARRANTY_VERIFICATION_STEPS = [
  'Sector',
  'Service',
  'Template',
  'Costing',
  'Batch',
];

export const WARRANTY_VERIFICATION_STEP_ROUTES = [
  '/org/product/sector',
  '/org/product/service',
  '/org/product/template',
  '/org/product/costing',
  '/org/batch-status',
];

export const WARRANTY_VERIFICATION_STEP_META = {
  sector:   { currentStep: 0, label: 'Step 1 of 5', progress: 20 },
  service:  { currentStep: 1, label: 'Step 2 of 5', progress: 40 },
  template: { currentStep: 2, label: 'Step 3 of 5', progress: 60 },
  costing:  { currentStep: 3, label: 'Step 4 of 5', progress: 80 },
  batch:    { currentStep: 4, label: 'Step 5 of 5', progress: 100 },
};

export const PRODUCT_SERVICE_OPTIONS = [
  {
    id: 'verification',
    title: 'Product Verification',
    description: 'Issue authenticity / compliance certificates for products.',
    warrantyStatus: 'not_applicable',
  },
  {
    id: 'warranty',
    title: 'Warranty',
    description: 'Create warranty certificates linked to serial numbers.',
    warrantyStatus: 'active',
  },
];

export const PRODUCT_CERTIFICATE_TEMPLATES = [
  {
    id: 'product-classic',
    name: 'Classic Blue',
    image: '/assets/product/WhatsApp Image 2026-06-03 at 3.58.19 PM.jpeg',
  },
  {
    id: 'product-trust',
    name: 'Trust Blue',
    image: '/assets/product/WhatsApp Image 2026-06-03 at 3.58.19 PM (1).jpeg',
  },
  {
    id: 'product-clean',
    name: 'Clean Blue',
    image: '/assets/product/WhatsApp Image 2026-06-03 at 3.58.19 PM (2).jpeg',
  },
];

export const PRODUCT_SECTOR_DEFS = [
  {
    id: 'electronics_appliances',
    title: 'Electronics',
    description: 'Warranty and serial-based certificates for devices and appliances.',
    aliases: ['electronics & appliances', 'electronics', 'appliances'],
    fallbackWarranty: 'required',
  },
  {
    id: 'beauty_cosmetics',
    title: 'Beauty & Cosmetics',
    description: 'Authenticity certificates with lab reports and batch proofs.',
    aliases: ['beauty & cosmetics', 'beauty products', 'cosmetics', 'personal care'],
    fallbackWarranty: 'disabled',
  },
];

// Must match the backend's warranty Excel contract — pure record metadata
// only. `warrenty_report` and `product_details` are NOT Excel columns at all
// — both are document-URL destinations, populated exclusively via
// POST /products/{batch_user_id}/warranty-document (document_label:
// "Warranty Report" or "Product Details") after the batch exists. `serial_no`
// and `created_time` are also absent — the backend assigns serial_no at
// reservation (see reserveWarrantySerials) and created_time at SDC issuance.
// This is only a fallback: the real, live column list is fetched from the
// backend's own template file (see the warrantyHeaders effect) and takes
// priority whenever it succeeds.
export const WARRANTY_SERVICE_HEADERS = [
  'customer_name',
  'model_no',
  'purchase_date',
  'expiration_date',
];

// Canonical column set for the normal Product Verification flow. `sku_no` is
// mandatory alongside product_name (it's the collision-proof key the backend
// uses internally; the frontend no longer attaches any document during this
// upload at all). third+party+qr1 and third+party+qr2 are included here so
// the downloaded template's column structure matches the backend's — but
// they must always download with EMPTY sample values (see downloadLocalFallback
// in ProductTemplate.jsx) and are never in VERIFICATION_REQUIRED_HEADERS.
// The org user must never fill these in manually; QR1/QR2 are populated
// exclusively by the backend's own qr_slot verifier-report workflow
// (assigned automatically by request-creation order). Even if a user types
// something into these columns before uploading, the frontend still never
// treats it as authoritative — it just posts the whole file and lets the
// backend's own ingestion decide what to trust, same as always.
export const VERIFICATION_SERVICE_HEADERS = [
  'product_name',
  'sku_no',
  'model_no',
  'brand',
  'third+party+qr1',
  'third+party+qr2',
];

export const VERIFICATION_REQUIRED_HEADERS = ['product_name', 'sku_no'];
