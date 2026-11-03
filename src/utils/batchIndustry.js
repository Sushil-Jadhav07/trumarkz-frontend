// The industry a user picked for their human batches when their profile industry (the
// *organization* list) has no counterpart in the Human list. The backend validates a profile
// industry against the organization list, so this choice cannot be saved there; it is kept per
// user in this browser instead, which keeps the picker a one-time question.
const keyFor = (userId) => `trumarkz_batch_industry_${userId || 'anon'}`;

export const getBatchIndustry = (userId, storage = globalThis.localStorage) => {
  try { return storage?.getItem(keyFor(userId)) || ''; } catch { return ''; }
};

export const setBatchIndustry = (userId, name, storage = globalThis.localStorage) => {
  try {
    if (name) storage?.setItem(keyFor(userId), name);
    else storage?.removeItem(keyFor(userId));
  } catch { /* blocked storage: the picker is simply asked again */ }
};
