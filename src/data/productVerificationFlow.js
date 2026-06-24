export const PRODUCT_VERIFICATION_STEPS = [
  'Sector',
  'Service',
  'Verifications',
  'Template',
  'Costing',
  'Preview',
  'Batch',
];

export const PRODUCT_VERIFICATION_STEP_ROUTES = [
  '/org/product/sector',
  '/org/product/service',
  '/org/product/verifications',
  '/org/product/template',
  '/org/product/costing',
  '/org/product/certificate-preview',
  '/org/product/create-batch',
];

export const PRODUCT_VERIFICATION_STEP_META = {
  sector:        { currentStep: 0, label: 'Step 1 of 7', progress: 14.29 },
  service:       { currentStep: 1, label: 'Step 2 of 7', progress: 28.57 },
  verifications: { currentStep: 2, label: 'Step 3 of 7', progress: 42.86 },
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

export const WARRANTY_SERVICE_HEADERS = [
  'product_name',
  'category',
  'serial_number',
  'purchase_date',
  'warranty_start_date',
  'warranty_end_date',
];

export const VERIFICATION_SERVICE_HEADERS = [
  'product_name',
  'serial_number',
  'model',
  'batch_number',
  'certificate_number',
];
