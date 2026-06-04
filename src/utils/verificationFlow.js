export const VERIFICATION_API_TYPE_MAP = {
  identity: 'aadhar',
  pan: 'pan',
  driving: 'driving',
  education: 'education',
  employment: 'employment',
  address: 'address',
  police: 'police',
  criminal: 'criminal',
  compliance: 'compliance',
};

const HUMAN_TEMPLATE_EXTRA_HEADERS = {
  identity: ['aadhar_number'],
  pan: ['pan_number'],
  driving: ['driving_licence_number', 'dl_expiry_date'],
  education: ['college_name', 'degree', 'graduation_year'],
  employment: ['employer_name', 'employment_duration', 'epfo_uan'],
  address: ['address_line1', 'city', 'pincode'],
  police: ['police_station', 'city_of_residence'],
  compliance: ['product_name', 'batch_number', 'compliance_standard'],
};

export const getVerificationApiTypes = (selectedVerifications = []) =>
  selectedVerifications
    .map((item) => VERIFICATION_API_TYPE_MAP[item] || item)
    .filter(Boolean);

export const getHumanTemplateHeaders = (selectedVerifications = []) => {
  const headers = ['full_name', 'email', 'phone_number', 'dob'];

  selectedVerifications.forEach((item) => {
    (HUMAN_TEMPLATE_EXTRA_HEADERS[item] || []).forEach((header) => {
      if (!headers.includes(header)) headers.push(header);
    });
  });

  return headers;
};

export const getIndustryTypeList = (selectedIndustry) => {
  if (!selectedIndustry) return [];
  if (Array.isArray(selectedIndustry)) {
    return selectedIndustry
      .map((item) => item?.name || item?.label || item?.id)
      .filter(Boolean);
  }

  return [selectedIndustry.name || selectedIndustry.label || selectedIndustry.id].filter(Boolean);
};

export const getProductVerificationTypes = (selectedService) => {
  if (!selectedService?.id) return [];
  return selectedService.id === 'warranty' ? ['warranty'] : ['authenticity'];
};
