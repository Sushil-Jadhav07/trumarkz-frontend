export const HUMAN_VERIFICATION_STEPS = [
  'Industry',
  'Verifications',
  'Permissions',
  'Template',
  'Costing',
  'Preview',
  'Batch',
];

export const HUMAN_VERIFICATION_STEP_ROUTES = [
  '/org/industry',
  '/org/verifications',
  '/org/permissions',
  '/org/template',
  '/org/costing',
  '/org/certificate-preview',
  '/org/create-batch',
];

export const HUMAN_VERIFICATION_STEP_META = {
  industry: { currentStep: 0, label: 'Step 1 of 7', progress: 14.29 },
  verifications: { currentStep: 1, label: 'Step 2 of 7', progress: 28.57 },
  permissions: { currentStep: 2, label: 'Step 3 of 7', progress: 42.86 },
  template: { currentStep: 3, label: 'Step 4 of 7', progress: 57.14 },
  cost: { currentStep: 4, label: 'Step 5 of 7', progress: 71.43 },
  preview: { currentStep: 5, label: 'Step 6 of 7', progress: 85.71 },
  batch: { currentStep: 6, label: 'Step 7 of 7', progress: 100 },
};
