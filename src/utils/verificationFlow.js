export const VERIFICATION_API_TYPE_MAP = {
  police: 'police',
  dob: 'dob',
  education: 'education',
  skills: 'skills',
  criminal_record: 'criminal_record',
  address: 'address',
  driving_license: 'driving_license',
  experience: 'experience',
  drug_test: 'drug_test',
  police_verification: 'police_verification',
  company: 'company',
};

const HUMAN_TEMPLATE_EXTRA_HEADERS = {
  police: ['police_station', 'city_of_residence'],
  dob: [],
  education: ['college_name', 'degree', 'graduation_year'],
  skills: ['primary_skill', 'skill_level', 'certification_name'],
  criminal_record: ['court_record_reference', 'city_of_residence'],
  address: ['address_line1', 'city', 'pincode'],
  driving_license: ['driving_licence_number', 'dl_expiry_date'],
  experience: ['employer_name', 'employment_duration', 'designation'],
  drug_test: ['lab_name', 'sample_id'],
  police_verification: ['police_station', 'address_line1', 'city'],
  company: ['company_name', 'employee_id'],
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
