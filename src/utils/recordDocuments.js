export const getDocumentViewUrl = (document, apiBaseUrl = '') => {
  // Use the backend-provided URL unchanged, including signed query strings.
  const url = document.document_url;
  if (typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url))) return url;
  // Legacy responses contain private gs:// paths. The documented viewer
  // resolves the stored document by ID, never by a guessed bucket URL.
  return document.id ? `${apiBaseUrl.replace(/\/$/, '')}/verification/documents/${encodeURIComponent(document.id)}/view` : null;
};

export const getDocumentViewCandidates = (document, apiBaseUrl = '') => {
  const primary = getDocumentViewUrl(document, apiBaseUrl);
  const storedViewer = document.id ? getDocumentViewUrl({ id: document.id }, apiBaseUrl) : null;
  return [...new Set([primary, storedViewer].filter(Boolean))];
};

export const fetchDocumentFile = async (urls, fetchFile, signal) => {
  for (const url of urls) {
    try {
      const response = await fetchFile(url, { signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Document unavailable');
      const blob = await response.blob();
      if (blob.type.includes('application/json') || blob.type.includes('text/html')) throw new Error('The server returned an error instead of a document');
      return { blob, viewUrl: url };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  throw new Error('Document unavailable');
};

export const getRecordDocuments = (record) => {
  // The collection is complete: preserve every label and every version.
  return Array.isArray(record.documents) ? [...record.documents] : [];
};
