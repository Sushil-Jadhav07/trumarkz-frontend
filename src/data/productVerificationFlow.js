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

// Must match the backend's warranty Excel contract: 8 fixed columns with
// the warranty-specific fields in the same order the template download uses.
export const WARRANTY_SERVICE_HEADERS = [
  'customer_name',
  'model_no',
  'warrenty_report',
  'product_details',
  'purchase_date',
  'expiration_date',
  'created_time',
  'serial_number',
];

// Canonical column set for the normal Product Verification flow — updated
// per the production SKU/document-association architecture: `sku_no` is now
// a mandatory column alongside product_name (it's the collision-proof key
// used to attach documents to the right product *before* the backend has
// created any BatchUser rows — product_name alone can't do that safely once
// two rows share a name). `third+party+qr1` is no longer user-filled here —
// the backend populates it automatically with the document's view URL once
// a Product document is uploaded, so it must not appear in the template the
// org fills in. `third+party+qr2` remains a plain optional column. The "+"
// in it is canonical to the backend's field name and must be preserved
// exactly, never normalised to "_".
export const VERIFICATION_SERVICE_HEADERS = [
  'product_name',
  'sku_no',
  'model_no',
  'brand',
  'third+party+qr2',
];

export const VERIFICATION_REQUIRED_HEADERS = ['product_name', 'sku_no'];
