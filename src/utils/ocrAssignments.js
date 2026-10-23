export const OCR_GENDERS = ['Male', 'Female', 'Other'];
// Only examples explicitly supplied by the backend documentation. This is
// not a fabricated replacement for its missing 195-entry constant.
export const OCR_NATIONALITY_SUGGESTIONS = ['Afghan', 'American', 'Indian', 'Zimbabwean'];

export const normalizeAssignmentValue = (value, field) => {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || !value.trim() || value.includes(',') || value.trim().toLowerCase() === 'all') throw new Error(`Choose one individual ${field}; “All” and comma-separated values are not supported.`);
  const normalized = value.trim();
  const options = field === 'gender' ? OCR_GENDERS : OCR_NATIONALITY_SUGGESTIONS;
  const supported = options.find((option) => option.toLowerCase() === normalized.toLowerCase());
  if (field === 'gender' && !supported) throw new Error('Choose Male, Female or Other.');
  return supported || normalized; // Backend validates the complete demonym list.
};

export const validateOcrAssignments = (assignments, fileCount) => {
  if (assignments == null) return [];
  if (!Array.isArray(assignments)) throw new Error('Assignments must be an array of groups.');
  return assignments.map((group) => {
    if (!group || !Array.isArray(group.file_indices) || !group.file_indices.length) throw new Error('Choose at least one document for each assignment group.');
    if (group.file_indices.some((index) => !Number.isInteger(index) || index < 0 || index >= fileCount)) throw new Error('An assignment references a document outside this upload. Review your selections.');
    const gender = normalizeAssignmentValue(group.gender, 'gender');
    const nationality = normalizeAssignmentValue(group.nationality, 'nationality');
    if (!gender && !nationality) throw new Error('Choose Gender or Nationality for each assignment group.');
    return { file_indices: [...new Set(group.file_indices)], ...(gender ? { gender } : {}), ...(nationality ? { nationality } : {}) };
  });
};

export const buildOcrAssignments = (groups = [], orderedEntries = []) => {
  const ids = orderedEntries.map((entry) => String(entry.localId ?? entry.id));
  if (new Set(ids).size !== ids.length || ids.some((id) => !id || id === 'undefined')) throw new Error('Could not confirm document identities.');
  return validateOcrAssignments(groups.map((group) => ({
    file_indices: (group.entryIds || []).map((id) => ids.indexOf(String(id))),
    gender: group.gender, nationality: group.nationality,
  })), orderedEntries.length);
};

export const applyOcrAssignmentsToPreview = (records, entries, groups) => {
  const assignments = buildOcrAssignments(groups, entries);
  const values = entries.map(() => ({}));
  for (const group of assignments) for (const index of group.file_indices) {
    if (group.gender) values[index].gender = group.gender;
    if (group.nationality) values[index].nationality = group.nationality;
  }
  return records.map((record) => {
    const index = entries.findIndex((entry) => String(entry.id) === String(record.id));
    if (index < 0) throw new Error('Could not match a preview to its original document.');
    return { ...record, ...values[index] };
  });
};
