import { sdcAPI } from '@/services/api';

export const normalizeMatchKey = (value) => String(value || '').trim().toLowerCase();

export const getProductSerialNumber = (record) =>
  record?.serial_number ||
  record?.serial_no ||
  record?.custom_fields?.serial_number ||
  record?.custom_fields?.serial_no ||
  record?.customFields?.serial_number ||
  record?.customFields?.serial_no ||
  record?.metadata?.serial_number ||
  record?.metadata?.serial_no ||
  '';

// The certificate's own structured credential data (credentialSubject.serial_no)
// is the authoritative, identity-based association key confirmed live against
// Dhiway — prefer it over `title`, which only works if the org's Dhiway schema
// happens to echo the serial number into the title field.
export const getCertificateSerialNumber = (rec) =>
  rec?.credential?.credentialSubject?.serial_no ||
  rec?.credentialSubject?.serial_no ||
  rec?.record?.credentialSubject?.serial_no ||
  rec?.credential?.credentialSubject?.serial_number ||
  rec?.credentialSubject?.serial_number ||
  null;

// Fetches each certificate's full detail (from a warranty status response's
// certificate_ids) and pairs them to products by serial-number identity —
// never by array position/index, which is not a valid association key here
// (products and certificate_ids can come back in different orders). A
// product that can't be matched this way is left unpaired rather than
// guessed at by position. Mirrors the admin Batch Monitor's matching logic
// so org and admin views never disagree about which product a cert belongs to.
export const loadWarrantyCertificates = async (resp) => {
  const certIds = Array.isArray(resp?.certificate_ids) ? resp.certificate_ids : [];
  if (certIds.length === 0) return { sdcByProductId: {}, sdcRecords: [] };

  const fetched = await Promise.all(
    certIds.map((publicId) =>
      sdcAPI.getRecord(publicId)
        .then(({ data: rec }) => ({
          id: rec?.id, publicId: rec?.publicId || publicId, title: rec?.title,
          serialNo: getCertificateSerialNumber(rec),
          anchorTime: rec?.anchorTime || null,
          revoked: !!rec?.revoked,
          // Presence in certificate_ids already means the backend confirmed
          // sdc_status: "sdc_created" — no need to also require anchorTime.
          issued: !rec?.revoked,
        }))
        .catch(() => null)
    )
  );
  const sdcRecords = fetched.filter(Boolean);

  const freshProducts = resp?.products || [];
  const approvedProducts = freshProducts.filter((p) => (p.warranty_status || 'approved') === 'approved');

  const certsBySerial = new Map();
  const certsByTitle = new Map();
  sdcRecords.forEach((cert) => {
    const serialKey = normalizeMatchKey(cert.serialNo);
    if (serialKey && !certsBySerial.has(serialKey)) certsBySerial.set(serialKey, cert);
    const titleKey = normalizeMatchKey(cert.title);
    if (titleKey && !certsByTitle.has(titleKey)) certsByTitle.set(titleKey, cert);
  });

  const sdcByProductId = {};
  approvedProducts.forEach((product) => {
    const productId = product.product_id || product.id;
    if (!productId) return;
    const serial = normalizeMatchKey(getProductSerialNumber(product));
    if (!serial) return;
    const cert = certsBySerial.get(serial) || certsByTitle.get(serial);
    if (cert) sdcByProductId[productId] = cert;
  });

  return { sdcByProductId, sdcRecords };
};
