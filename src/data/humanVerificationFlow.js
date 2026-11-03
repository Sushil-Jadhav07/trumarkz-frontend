// The organization's industry is set once in Profile (it is chosen at onboarding), so the batch
// wizard starts at Verifications — there is no Industry step to go back to.
export const HUMAN_VERIFICATION_STEPS = [
  'Verifications',
  'Permissions',
  'Template',
  'Costing',
  'Batch',
];

export const HUMAN_VERIFICATION_STEP_ROUTES = [
  '/org/verifications',
  '/org/permissions',
  '/org/template',
  '/org/costing',
  '/org/create-batch',
];

export const HUMAN_VERIFICATION_STEP_META = {
  verifications: { currentStep: 0, label: 'Step 1 of 5', progress: 20 },
  permissions: { currentStep: 1, label: 'Step 2 of 5', progress: 40 },
  template: { currentStep: 2, label: 'Step 3 of 5', progress: 60 },
  cost: { currentStep: 3, label: 'Step 4 of 5', progress: 80 },
  batch: { currentStep: 4, label: 'Step 5 of 5', progress: 100 },
};
