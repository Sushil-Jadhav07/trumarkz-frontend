// The industry an organization picked at onboarding (profile `industry_type`) can be a string
// or a list. This finds the matching entry of a flow's industry list so the batch wizard can
// start with it already chosen instead of asking again.
export const profileIndustries = (value) => {
  const items = Array.isArray(value) ? value : (value ? [value] : []);
  return items.map((item) => String(item ?? '').trim()).filter(Boolean);
};

export const matchProfileIndustry = (value, industries = []) => {
  for (const name of profileIndustries(value)) {
    const match = industries.find((industry) => (
      industry.name.toLowerCase() === name.toLowerCase() || industry.id === name.toLowerCase().replace(/[\s-]+/g, '_')
    ));
    if (match) return match;
  }
  return null;
};
