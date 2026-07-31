export const HUMAN_VERIFICATION_STEPS = [
  'Industry',
  'Verifications',
  'Permissions',
  'Template',
  'Costing',
  'Batch',
];

export const HUMAN_VERIFICATION_STEP_ROUTES = [
  '/org/industry',
  '/org/verifications',
  '/org/permissions',
  '/org/template',
  '/org/costing',
  '/org/create-batch',
];

export const HUMAN_VERIFICATION_STEP_META = {
  industry: { currentStep: 0, label: 'Step 1 of 6', progress: 16.67 },
  verifications: { currentStep: 1, label: 'Step 2 of 6', progress: 33.33 },
  permissions: { currentStep: 2, label: 'Step 3 of 6', progress: 50 },
  template: { currentStep: 3, label: 'Step 4 of 6', progress: 66.67 },
  cost: { currentStep: 4, label: 'Step 5 of 6', progress: 83.33 },
  batch: { currentStep: 5, label: 'Step 6 of 6', progress: 100 },
};
