import { humanEmailError } from './humanEmail.js';
import { humanPhoneError } from './humanPhone.js';

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
    // Phone overrides use the backend's per-holder contract; demographic/email
    // groups retain file_indices. Do not silently translate ambiguous targets.
    if (group && Object.prototype.hasOwnProperty.call(group, 'phone_number')) {
      if (!Number.isInteger(group.file_index) || group.file_index < 0 || group.file_index >= fileCount) throw new Error('A Phone Number assignment must reference one valid file_index in this upload.');
      if (['file_indices', 'email', 'gender', 'nationality'].some((key) => Object.prototype.hasOwnProperty.call(group, key))) throw new Error('Keep each Phone Number in a separate file_index assignment.');
      if (typeof group.phone_number !== 'string' || !group.phone_number.trim() || humanPhoneError(group.phone_number, 'public')) throw new Error('Enter a valid Phone Number for the assigned document (10–15 digits).');
      return { file_index: group.file_index, phone_number: group.phone_number.trim() };
    }
    if (!group || !Array.isArray(group.file_indices) || !group.file_indices.length) throw new Error('Choose at least one document for each assignment group.');
    if (group.file_indices.some((index) => !Number.isInteger(index) || index < 0 || index >= fileCount)) throw new Error('An assignment references a document outside this upload. Review your selections.');
    const gender = normalizeAssignmentValue(group.gender, 'gender');
    const nationality = normalizeAssignmentValue(group.nationality, 'nationality');
    const hasEmail = Object.prototype.hasOwnProperty.call(group, 'email');
    if (hasEmail && group.file_indices.length !== 1) throw new Error('An email assignment must target exactly one document.');
    if (hasEmail && (typeof group.email !== 'string' || !group.email.trim() || humanEmailError(group.email, 'public'))) throw new Error('Enter a valid email address for the assigned document.');
    const email = hasEmail ? group.email.trim() : undefined;
    if (!gender && !nationality && !email) throw new Error('Choose Gender, Nationality or an individual Email for each assignment group.');
    return { file_indices: [...new Set(group.file_indices)], ...(gender ? { gender } : {}), ...(nationality ? { nationality } : {}), ...(email ? { email } : {}) };
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
