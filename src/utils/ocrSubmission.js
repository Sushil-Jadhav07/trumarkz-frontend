import { matchOcrEntries, saveOcrReviewRecord } from './ocrReview.js';

export const buildOcrDraftRecord = (entry, data) => {
  const extracted = data?.extracted || data?.extracted_data || data?.fields || data;
  if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)
    || !Object.keys(extracted).some((key) => !['message', 'success', 'document_type'].includes(key))) {
    throw new Error('OCR did not return extracted fields for this document');
  }
  return { id: entry.id, document_type: data.document_type || extracted.document_type, extracted };
};

export const extractOcrDraft = async (entries, api) => {
  const results = await Promise.allSettled(entries.map(async (entry) => {
    const { data } = await api.extractOcrDocument(entry.file);
    return buildOcrDraftRecord(entry, data);
  }));
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed) throw new Error(`${failed} document(s) could not be extracted. Retry before proceeding. No batch was created.`);
  return results.map((result) => result.value);
};

// Costing owns this operation. A checkpoint survives any attachment or
// correction failure, so retrying never repeats successful writes or creates
// a second batch. Draft IDs only identify local files; server IDs come from
// the batch upload response.
export const submitOcrDraft = async ({ draft, batchName, options, api, progress, checkpoint }) => {
  if (!progress.response) {
    const { data } = await api.bulkUploadDocuments(draft.records.map((record) => record.file), batchName, options);
    progress.response = data;
    checkpoint(progress);
  }
  const users = progress.response.successful_users || [];
  if (!users.length) throw new Error('No OCR records were created. Check the skipped document details.');
  const entries = draft.records.map((record) => ({ id: record.localId, file: record.file }));
  const matches = matchOcrEntries(progress.response, entries);
  for (const user of users) {
    if (progress.completedIds.includes(user.id)) continue;
    const source = matches[user.id];
    const record = draft.records.find((item) => item.localId === source?.id);
    if (!record) throw new Error('The server could not identify a document. The existing batch was kept; no duplicate batch will be created.');
    if (record.photo && !progress.photoSavedIds.includes(user.id)) {
      const { data } = await api.uploadOcrPhoto(user.id, record.photo);
      if (!data?.document_id) throw new Error('The server did not confirm the photo was saved');
      progress.photoSavedIds.push(user.id);
      checkpoint(progress);
    }
    const attachment = record.attachment ? {
      ...record.attachment, uploaded: !!progress.savedAttachments[user.id],
    } : null;
    try {
      await saveOcrReviewRecord({ userId: user.id, payload: record.payload, attachment,
        uploadDocument: api.uploadHumanDocument, updateUser: api.updateBatchUser });
    } finally {
      if (attachment?.uploaded) progress.savedAttachments[user.id] = attachment.savedDocument || progress.savedAttachments[user.id];
      checkpoint(progress);
    }
    progress.completedIds.push(user.id);
    checkpoint(progress);
  }
  return progress.response;
};
