export const PRODUCT_VERIFICATION_STEPS = [
  'Sector',
  'Verifications',
  'Service',
  'Template',
  'Costing',
  'Preview',
  'Batch',
];

export const PRODUCT_VERIFICATION_STEP_ROUTES = [
  '/org/product/sector',
  '/org/product/verifications',
  '/org/product/service',
  '/org/product/template',
  '/org/product/costing',
  '/org/product/certificate-preview',
  '/org/product/create-batch',
];

export const PRODUCT_VERIFICATION_STEP_META = {
  sector:        { currentStep: 0, label: 'Step 1 of 7', progress: 14.29 },
  verifications: { currentStep: 1, label: 'Step 2 of 7', progress: 28.57 },
  service:       { currentStep: 2, label: 'Step 3 of 7', progress: 42.86 },
  template:      { currentStep: 3, label: 'Step 4 of 7', progress: 57.14 },
  costing:       { currentStep: 4, label: 'Step 5 of 7', progress: 71.43 },
  preview:       { currentStep: 5, label: 'Step 6 of 7', progress: 85.71 },
  batch:         { currentStep: 6, label: 'Step 7 of 7', progress: 100 },
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
    name: 'Classic',
    image: '/assets/product/WhatsApp%20Image%202026-06-03%20at%203.58.19%20PM.jpeg',
  },
  {
    id: 'product-trust',
    name: 'Trust',
    image: '/assets/product/WhatsApp%20Image%202026-06-03%20at%203.58.19%20PM%20(1).jpeg',
  },
  {
    id: 'product-clean',
    name: 'Clean',
    image: '/assets/product/WhatsApp%20Image%202026-06-03%20at%203.58.19%20PM%20(2).jpeg',
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

export const WARRANTY_SERVICE_HEADERS = [
  'product_name',
  'serial_number',
  'warranty_start_date',
  'warranty_end_date',
  'invoice_number',
];

export const VERIFICATION_SERVICE_HEADERS = [
  'product_name',
  'serial_number',
  'model',
  'batch_number',
  'certificate_number',
];
