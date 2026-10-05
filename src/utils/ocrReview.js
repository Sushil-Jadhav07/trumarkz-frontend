// Never use a person's name to associate an OCR result with an upload.
// Older responses omit successful filenames; use upload order only when
// every outcome is accounted for and skipped filenames are unambiguous.
export const matchOcrEntries = (result, entries) => {
  const users = result?.successful_users || [];
  const failures = [...(result?.skipped_users || []), ...(result?.errors || [])];
  const failedFiles = new Set(failures.map((item) => item.file).filter(Boolean));
  const filenameCounts = new Map();
  entries.forEach((entry) => {
    filenameCounts.set(entry.file.name, (filenameCounts.get(entry.file.name) || 0) + 1);
  });
  const survivors = entries.filter((entry) => !failedFiles.has(entry.file.name));
  const canUseOrder = survivors.length === users.length
    && failures.every((item) => item.file && filenameCounts.get(item.file) === 1);
  const matches = {};
  users.forEach((user, index) => {
    if (user.file) {
      if (filenameCounts.get(user.file) === 1) {
        matches[user.id] = entries.find((entry) => entry.file.name === user.file);
      }
    } else if (canUseOrder) {
      matches[user.id] = survivors[index];
    }
  });
  return matches;
};

// Keep successful attachment uploads across correction-save retries.
// A failed attachment must prevent the record being marked reviewed.
export const saveOcrReviewRecord = async ({ userId, payload, attachment, uploadDocument, updateUser }) => {
  if (attachment && !attachment.uploaded) {
    const label = attachment.label.trim();
    if (!label) throw new Error('Enter a label for the additional document');
    const { data } = await uploadDocument(userId, label, attachment.file);
    if (!data?.document_id) throw new Error('The server did not confirm the additional document was saved');
    if (data.user_id && data.user_id !== userId) throw new Error('The server returned a document for a different record');
    attachment.savedDocument = data;
    attachment.label = label;
    attachment.uploaded = true;
  }
  await updateUser(userId, payload);
};
