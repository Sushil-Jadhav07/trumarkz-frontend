import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { StepWizard } from '@/components/ui/StepWizard';
import { FileUpload } from '@/components/ui/FileUpload';
import { ArrowRight, CheckCircle, Download, Eye, FileImage, Plus, RefreshCw, Upload, X, AlertTriangle, Camera, Layers, Images } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '@/context/AppContext';
import { HUMAN_VERIFICATION_STEPS, HUMAN_VERIFICATION_STEP_META, HUMAN_VERIFICATION_STEP_ROUTES } from '@/data/humanVerificationFlow';
import { verificationAPI, triggerBlobDownload, getApiError } from '@/services/api';
import { getVerificationApiTypes, getIndustryTypeList } from '@/utils/verificationFlow';
import { extractOcrDraft } from '@/utils/ocrSubmission';

// photo is appended automatically by the API — never pass it in headers
const BASE_FIELDS = [
  { key: 'full_name',     label: 'Full Name' },
  { key: 'email',         label: 'Email' },
  { key: 'phone_number',  label: 'Phone Number' },
  { key: 'dob',           label: 'Date of Birth', hint: 'YYYY-MM-DD' },
  { key: 'aadhar_number', label: 'Aadhar Number' },
  { key: 'pan_number',    label: 'PAN Number' },
  { key: 'dl_number',     label: 'DL Number' },
  { key: 'gender',        label: 'Gender' },
  { key: 'nationality',   label: 'Nationality' },
];

// Editable fields offered in the OCR review popup — this is the exact set
// PATCH /verification/batch-users/{user_id} accepts.
const REVIEW_FIELDS = [
  { key: 'full_name',      label: 'Full Name' },
  { key: 'email',          label: 'Email' },
  { key: 'phone_number',   label: 'Phone Number' },
  { key: 'dob',            label: 'Date of Birth', hint: 'YYYY-MM-DD' },
  { key: 'aadhar_number',  label: 'Aadhar Number' },
  { key: 'pan_number',     label: 'PAN Number' },
  { key: 'address_line1',  label: 'Address Line 1' },
  { key: 'address_line2',  label: 'Address Line 2' },
  { key: 'pincode',        label: 'Pincode' },
  { key: 'state',          label: 'State' },
];

// OCR's `extracted` blob has no fixed schema — key names vary per document
// type/model run (e.g. "mobile" not "phone_number", "aadhaar_number" not
// "aadhar_number"). Try each known alias in order when prefilling a field.
const FIELD_ALIASES = {
  full_name:      ['full_name', 'name', 'recipient_name'],
  email:          ['email'],
  phone_number:   ['phone_number', 'mobile', 'phone', 'mobile_number'],
  dob:            ['dob', 'date_of_birth'],
  aadhar_number:  ['aadhar_number', 'aadhaar_number', 'aadhaar_no', 'aadhar_no'],
  pan_number:     ['pan_number', 'pan'],
  address_line1:  ['address_line1', 'address'],
  address_line2:  ['address_line2'],
  pincode:        ['pincode', 'pin_code'],
  state:          ['state'],
};

// Document-type-aware field sets. The backend classifies each uploaded
// document and returns `document_type` on every successful_users[] entry
// (canonical: "driving_license" | "aadhaar" | "pan"); we render ONLY that
// type's fields — the type is never inferred from OCR field names, formats,
// or filenames. `custom: true` marks a field whose value lives in
// custom_fields (both when reading it back and when PATCHing) rather than as
// a top-level batch-user column. `aliases` are the OCR `extracted`-blob key
// variants to prefill from.
const DOC_TYPE_FIELDS = {
  driving_license: [
    { key: 'full_name',      label: 'Full Name',      aliases: ['full_name', 'name'] },
    { key: 'dob',            label: 'Date of Birth', hint: 'YYYY-MM-DD', aliases: ['dob', 'date_of_birth'] },
    { key: 'license_number', label: 'License Number', aliases: ['license_number', 'dl_number', 'dl_no', 'licence_number', 'dl'] },
    { key: 'issue_date',     label: 'Issue Date',     custom: true, aliases: ['issue_date', 'doi', 'date_of_issue'] },
    { key: 'valid_till',     label: 'Valid Till',     custom: true, aliases: ['valid_till', 'valid_upto', 'doe', 'date_of_expiry', 'expiry_date'] },
    { key: 'address_line1',  label: 'Address',        aliases: ['address_line1', 'address', 'full_address'] },
    { key: 'pincode',        label: 'Pincode',        aliases: ['pincode', 'pin_code', 'pin'] },
  ],
  aadhaar: [
    { key: 'full_name',     label: 'Full Name',      aliases: ['full_name', 'name'] },
    { key: 'dob',           label: 'Date of Birth', hint: 'YYYY-MM-DD', aliases: ['dob', 'date_of_birth'] },
    { key: 'birth_year',    label: 'Birth Year',     custom: true, aliases: ['birth_year', 'year_of_birth', 'yob'] },
    { key: 'gender',        label: 'Gender',         custom: true, aliases: ['gender', 'sex'] },
    { key: 'aadhar_number', label: 'Aadhaar Number', aliases: ['aadhar_number', 'aadhaar_number', 'aadhaar_no', 'aadhar_no', 'uid'] },
    { key: 'address_line1', label: 'Address',        aliases: ['address_line1', 'address', 'full_address'] },
    { key: 'pincode',       label: 'Pincode',        aliases: ['pincode', 'pin_code', 'pin'] },
  ],
  pan: [
    { key: 'full_name',   label: 'Full Name',     aliases: ['full_name', 'name'] },
    { key: 'father_name', label: "Father's Name", custom: true, aliases: ['father_name', 'fathers_name', 'father_s_name', 'father'] },
    { key: 'pan_number',  label: 'PAN Number',    aliases: ['pan_number', 'pan', 'pan_no'] },
    { key: 'dob',         label: 'Date of Birth', hint: 'YYYY-MM-DD', aliases: ['dob', 'date_of_birth'] },
  ],
};

const DOC_TYPE_LABELS = {
  driving_license: 'Driving License',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
};

const normalizeDocType = (value) =>
  (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Only the backend value decides. Anything that isn't one of the three
// canonical types — including "document", null, undefined, "" — falls back
// to the existing generic field list. We never guess DL/Aadhaar/PAN.
const getReviewFields = (documentType) => {
  const dt = normalizeDocType(documentType);
  return DOC_TYPE_FIELDS[dt] || REVIEW_FIELDS;
};

// OCR commonly returns DOB as DD/MM/YYYY or DD-MM-YYYY — PATCH expects
// YYYY-MM-DD (per the documented example "1998-04-12").
const normalizeDob = (value) => {
  const match = String(value || '').match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return value || '';
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const sanitizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Builds each user's editable form. Which fields are shown is decided
// solely by the backend's `document_type` (getReviewFields). Each field is
// prefilled from the top-level user column (or custom_fields for `custom`
// fields), falling back to any alias against the raw `extracted` blob.
// Anything in `extracted` that no field consumed — plus any pre-existing
// custom_fields not surfaced as an editable field — is kept in
// `_customFields` so it's never silently lost; it goes out under PATCH's
// `custom_fields` on confirm and is shown in the "Also Extracted" row.
const buildInitialForms = (result) => {
  const users = result?.successful_users || [];
  const map = {};
  users.forEach((u) => {
    const extracted = (u.extracted && typeof u.extracted === 'object') ? u.extracted : {};
    const existingCustom = (u.custom_fields && typeof u.custom_fields === 'object') ? u.custom_fields : {};
    const docType = normalizeDocType(u.document_type);
    const fields = getReviewFields(docType);
    const consumedKeys = new Set();
    const values = {};
    fields.forEach((f) => {
      const aliases = f.aliases || FIELD_ALIASES[f.key] || [f.key];
      let value = f.custom ? existingCustom[f.key] : u[f.key];
      if (value === undefined || value === null || value === '') {
        const aliasKey = aliases.find((a) => extracted[a] !== undefined && extracted[a] !== null && extracted[a] !== '');
        if (aliasKey) {
          value = extracted[aliasKey];
          consumedKeys.add(aliasKey);
        }
      }
      // `dob` is always normalized DD/MM/YYYY → YYYY-MM-DD (both generic and
      // document-typed flows, PATCH expects the ISO form). Everything else,
      // including issue_date / valid_till, is shown exactly as extracted.
      values[f.key] = f.key === 'dob' ? normalizeDob(value) : (value ?? '');
    });

    const leftover = Object.fromEntries(
      Object.entries(extracted).filter(([k]) => !consumedKeys.has(k))
    );
    const surfacedCustomKeys = new Set(fields.filter((f) => f.custom).map((f) => f.key));
    Object.entries(existingCustom).forEach(([k, v]) => {
      if (!surfacedCustomKeys.has(k) && !(k in leftover)) leftover[k] = v;
    });

    values._docType = DOC_TYPE_FIELDS[docType] ? docType : '';
    values._customKeys = fields.filter((f) => f.custom).map((f) => f.key);
    values._customFields = leftover;
    map[u.id] = values;
  });
  return map;
};

// OCR draft review: extraction and confirmation do not create a batch.
const ReviewOcrModal = ({ isOpen, ocrResult, sourceEntries = {}, onClose, onDone }) => {
  const [forms, setForms] = useState({});
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmedIds, setConfirmedIds] = useState(new Set());
  const [finishing, setFinishing] = useState(false);
  const [finalPreview, setFinalPreview] = useState(false);
  const [attachments, setAttachments] = useState({});
  const attachmentsRef = useRef({});

  const clearAttachments = () => {
    Object.values(attachmentsRef.current).forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    attachmentsRef.current = {};
  };

  useEffect(() => () => clearAttachments(), []);

  // ReviewOcrModal stays mounted the whole time (visibility is just the
  // `isOpen` prop passed to <Modal>), so a lazy useState initializer would
  // only ever run once with ocrResult still null — forms must be rebuilt
  // whenever a fresh upload result actually arrives.
  useEffect(() => {
    setForms(buildInitialForms(ocrResult));
    setConfirmedIds(new Set());
    setFinalPreview(false);
    clearAttachments();
    setAttachments({});
  }, [ocrResult]);

  const users = ocrResult?.successful_users || [];
  const skipped = ocrResult?.skipped_users || [];
  const errors = ocrResult?.errors || [];

  const updateField = (userId, key, value) =>
    setForms((prev) => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }));

  const setAttachment = (userId, attachment) => {
    const previous = attachmentsRef.current[userId];
    if (previous && previous.previewUrl !== attachment?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
    const next = { ...attachmentsRef.current };
    if (attachment) next[userId] = attachment;
    else delete next[userId];
    attachmentsRef.current = next;
    setAttachments(next);
    setConfirmedIds((prev) => {
      const nextIds = new Set(prev);
      nextIds.delete(userId);
      return nextIds;
    });
  };

  const selectAttachment = (userId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Choose a document image or PDF');
      return;
    }
    setAttachment(userId, { file, previewUrl: URL.createObjectURL(file), label: 'supporting_document', uploaded: false });
  };

  // Split the form back into top-level batch-user fields and custom_fields:
  // fields flagged `custom` in DOC_TYPE_FIELDS (issue_date, valid_till,
  // gender, father_name) are merged into custom_fields alongside the
  // untouched leftover OCR data, never sent as top-level PATCH keys.
  // `_docType` / `_customKeys` are internal-only and never sent.
  const buildPayload = (userId) => {
    const { _customFields, _customKeys, _docType, ...allFields } = forms[userId] || {};
    const customKeySet = new Set(_customKeys || []);
    const topLevel = {};
    const customFromForm = {};
    Object.entries(allFields).forEach(([k, v]) => {
      if (customKeySet.has(k)) {
        // Only carry a non-empty edit into custom_fields — mirrors how
        // cleanObject already drops empty top-level fields, so an untouched
        // empty field never overwrites anything server-side.
        if (v !== undefined && v !== null && String(v).trim() !== '') customFromForm[k] = v;
      } else {
        topLevel[k] = v;
      }
    });
    return {
      ...topLevel,
      custom_fields: { ...(_customFields || {}), ...customFromForm },
      mark_reviewed: true,
    };
  };

  const confirmUser = async (userId) => {
    setConfirmingId(userId);
    try {
      await saveRecord(userId);
      setConfirmedIds((prev) => new Set(prev).add(userId));
    } catch (err) {
      toast.error(getApiError(err, err?.message || 'Failed to confirm this record'));
    } finally {
      setAttachments({ ...attachmentsRef.current });
      setConfirmingId(null);
    }
  };

  const saveRecord = async (userId) => {
    const attachment = attachmentsRef.current[userId];
    if (attachment && !attachment.label.trim()) throw new Error('Enter a label for the additional document');
    // Confirmation is local. No batch, photo, or attachment write happens
    // until the organization approves costing.
  };

  const handleFinish = async () => {
    setFinishing(true);
    const remaining = users.filter((u) => !confirmedIds.has(u.id));
    const results = await Promise.allSettled(
      remaining.map((u) => saveRecord(u.id))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    setConfirmedIds((prev) => {
      const next = new Set(prev);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') next.add(remaining[index].id);
      });
      return next;
    });
    setFinishing(false);
    setAttachments({ ...attachmentsRef.current });
    if (failed > 0) {
      toast.error(`${failed} record${failed === 1 ? '' : 's'} could not be confirmed. Check the document labels and retry.`);
      return;
    }
    setFinalPreview(true);
  };

  const continueFromPreview = () => onDone({
    records: users.map((user) => ({
      localId: user.id,
      file: sourceEntries[user.id].file,
      photo: sourceEntries[user.id].photo,
      document_type: user.document_type,
      payload: buildPayload(user.id),
      attachment: attachmentsRef.current[user.id] ? {
        file: attachmentsRef.current[user.id].file,
        label: attachmentsRef.current[user.id].label.trim(),
      } : null,
    })),
  });

  return (
    <Modal isOpen={isOpen} onClose={finishing || confirmingId !== null ? () => {} : onClose} title={finalPreview ? 'Final Preview' : 'Review Extracted Documents'} size="7xl" containerClassName="w-full max-w-7xl">
      <div className="space-y-4">
        <p className="font-inter text-sm text-slate-500">
          {finalPreview
            ? `${users.length} confirmed record${users.length === 1 ? '' : 's'}. Check the details and attachments before costing. Your batch will be created only after you approve the total cost.`
            : 'Review the extracted details and attach any additional documents. Confirmation saves your local draft; the batch and attachments are submitted after costing approval.'}
        </p>

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 font-inter text-xs text-slate-500">
          <span>{users.length} record{users.length === 1 ? '' : 's'}</span>
          <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle size={13} /> {confirmedIds.size} confirmed</span>
        </div>
        <div className="max-h-[min(58vh,calc(92dvh-20rem))] space-y-4 overflow-y-auto pr-1">
          {users.map((u) => {
            const isConfirmed = confirmedIds.has(u.id);
            const values = forms[u.id] || {};
            const docTypeLabel = DOC_TYPE_LABELS[normalizeDocType(u.document_type)] || null;
            const userFields = getReviewFields(u.document_type);
            const sourceEntry = sourceEntries[u.id];
            const attachment = attachments[u.id];
            return (
              <article key={u.id} className={`overflow-hidden rounded-xl border ${isConfirmed ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white'}`}>
                <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${isConfirmed ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/70'}`}>
                  <div className="min-w-0">
                    <p className="truncate font-sora text-sm font-semibold text-slate-950">{values.full_name || u.full_name || 'Unnamed record'}</p>
                    <p className="truncate font-inter text-xs text-slate-400">
                      {docTypeLabel || u.email || 'No email extracted'}
                    </p>
                  </div>
                  {isConfirmed ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle size={12} /> Confirmed
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={confirmingId === u.id}
                      disabled={finishing || confirmingId !== null}
                      onClick={() => confirmUser(u.id)}
                    >
                      Confirm
                    </Button>
                  )}
                </div>

                <div className="grid items-start gap-5 p-4 lg:grid-cols-[12rem_7rem_12rem_minmax(0,1fr)]">
                  <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] lg:contents">
                    <div className="min-w-0">
                      <p className="mb-1.5 font-inter text-xs font-medium text-slate-500">Uploaded document</p>
                      {sourceEntry ? (
                        <a href={sourceEntry.previewUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-slate-200 bg-slate-50 p-2" title="Open full-size document">
                          <img src={sourceEntry.previewUrl} alt={`Source document for ${u.full_name || 'this record'}`} className="h-36 w-full object-contain" />
                          <span title={sourceEntry.file.name} className="mt-2 block truncate font-inter text-[11px] text-slate-500">{sourceEntry.file.name}</span>
                          <span className="mt-1 flex items-center gap-1 font-inter text-xs text-brand-blue"><Eye size={12} /> Open full size</span>
                        </a>
                      ) : (
                        <p className="rounded-lg bg-slate-50 p-3 font-inter text-xs text-slate-500">The upload response could not identify the source image for this record.</p>
                      )}
                    </div>
                      <div className="min-w-0">
                        <p className="mb-1.5 font-inter text-xs font-medium text-slate-500">Attached photo</p>
                        {sourceEntry?.photoPreviewUrl ? (
                          <a href={sourceEntry.photoPreviewUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-slate-200 bg-slate-50 p-2" title="Open full-size photo">
                            <img src={sourceEntry.photoPreviewUrl} alt={`Attached photo for ${u.full_name || 'this record'}`} className="h-36 w-full object-contain" />
                            <span className="mt-2 flex items-center justify-center gap-1 font-inter text-[11px] text-brand-blue"><Eye size={12} /> View photo</span>
                          </a>
                        ) : (
                          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-2 text-center font-inter text-[11px] text-slate-400"><Camera size={20} /> No photo attached</div>
                        )}
                      </div>
                    <div className="min-w-0 space-y-2">
                      <p className="font-inter text-xs font-medium text-slate-500">Additional document</p>
                      {attachment ? (
                        <>
                          <a href={attachment.previewUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-slate-200 bg-slate-50 p-2" title="Open additional document">
                            {attachment.file.type.startsWith('image/') ? (
                              <img src={attachment.previewUrl} alt={`Additional document for ${values.full_name || 'this record'}`} className="h-36 w-full object-contain" />
                            ) : (
                              <span className="flex h-36 flex-col items-center justify-center gap-2 font-inter text-xs text-slate-500"><FileImage size={26} /> PDF document</span>
                            )}
                            <span title={attachment.file.name} className="mt-2 block truncate font-inter text-[11px] text-slate-500">{attachment.file.name}</span>
                            <span className="mt-1 flex items-center gap-1 font-inter text-xs text-brand-blue"><Eye size={12} /> Open full size</span>
                          </a>
                          {finalPreview || attachment.uploaded ? (
                            <p className="flex items-center gap-1 font-inter text-xs text-emerald-700"><CheckCircle size={12} /> Ready for submission · {attachment.label}</p>
                          ) : (
                            <>
                              <label className="block font-inter text-[11px] text-slate-500">
                                Document label
                                <input value={attachment.label} disabled={finishing || confirmingId !== null} onChange={(e) => setAttachment(u.id, { ...attachment, label: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900" />
                              </label>
                              <p className="font-inter text-[11px] text-slate-500">Uploads after costing approval</p>
                              <button type="button" disabled={finishing || confirmingId !== null} onClick={() => setAttachment(u.id, null)} className="font-inter text-xs text-red-500 disabled:opacity-50">Remove document</button>
                            </>
                          )}
                        </>
                      ) : finalPreview ? (
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center font-inter text-xs text-slate-400">No additional document</div>
                      ) : null}
                      {!finalPreview && !attachment?.uploaded && (
                        <label className={`relative flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-200 bg-blue-50/30 px-3 py-2 text-center font-inter text-xs font-semibold text-brand-blue transition-colors focus-within:ring-2 focus-within:ring-brand-blue/30 ${attachment ? '' : 'h-40 flex-col gap-2'} ${finishing || confirmingId !== null ? 'opacity-50' : 'cursor-pointer hover:border-brand-blue hover:bg-blue-50'}`}>
                          <Upload size={attachment ? 13 : 22} /> {attachment ? 'Replace document' : 'Upload another document'}
                          {!attachment && <span className="font-normal text-slate-400">Image or PDF</span>}
                          <input type="file" accept="image/*,application/pdf" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`Upload additional document for ${values.full_name || 'this record'}`} disabled={finishing || confirmingId !== null} onChange={(e) => { selectAttachment(u.id, e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-5">
                    <p className="mb-2 font-inter text-xs font-medium text-slate-500">{finalPreview ? 'Confirmed details' : 'Extracted details'}</p>
                  <div className="grid content-start grid-cols-2 gap-3 xl:grid-cols-3">
                    {userFields.map((f) => finalPreview ? (
                      <div key={f.key} className={f.key.startsWith('address_line') ? 'col-span-2 xl:col-span-3' : 'min-w-0'}>
                        <p className="mb-1 font-inter text-[11px] font-medium text-slate-500">{f.label}</p>
                        <p className="min-h-8 whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-2.5 py-1.5 font-inter text-xs text-slate-900">{String(values[f.key] ?? '').trim() || '—'}</p>
                      </div>
                    ) : (
                      <div key={f.key} className={f.key.startsWith('address_line') ? 'col-span-2 xl:col-span-3' : 'min-w-0'}>
                        <label className="block font-inter text-[11px] font-medium text-slate-500 mb-1">{f.label}</label>
                        {f.key.startsWith('address_line') ? (
                          <textarea rows={2} value={values[f.key] || ''} disabled={isConfirmed || finishing || confirmingId !== null} onChange={(e) => updateField(u.id, f.key, e.target.value)} className="w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 font-inter text-xs leading-relaxed text-slate-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 disabled:bg-slate-50 disabled:text-slate-500" />
                        ) : <input
                          value={values[f.key] || ''}
                          disabled={isConfirmed || finishing || confirmingId !== null}
                          onChange={(e) => updateField(u.id, f.key, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-inter text-xs text-slate-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 disabled:bg-slate-50 disabled:text-slate-400"
                        />}
                      </div>
                    ))}
                  </div>
                  </div>
                </div>

                {values._customFields && Object.keys(values._customFields).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    <span className="font-inter text-[10px] font-semibold uppercase tracking-wide text-slate-400">Also extracted (saved as extra info):</span>
                    {Object.entries(values._customFields).map(([k, v]) => (
                      <span key={k} className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {skipped.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <AlertTriangle size={13} /> Skipped Images ({skipped.length})
            </h4>
            <div className="mt-2 space-y-1.5">
              {skipped.map((s, i) => (
                <p key={i} className="font-inter text-xs text-amber-800">{s.file}: {s.reason}</p>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-3.5">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-red-600">
              <X size={13} /> Errors ({errors.length})
            </h4>
            <div className="mt-2 space-y-1.5">
              {errors.map((e, i) => (
                <p key={i} className="font-inter text-xs text-red-700">{e.error || JSON.stringify(e)}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          {finalPreview ? (
            <>
              <Button variant="outline" onClick={() => { setFinalPreview(false); setConfirmedIds(new Set()); }}>Back to Review</Button>
              <Button variant="primary" size="lg" icon={ArrowRight} onClick={continueFromPreview}>Continue to Costing</Button>
            </>
          ) : (
          <Button variant="primary" size="lg" loading={finishing} disabled={confirmingId !== null || users.length === 0} icon={ArrowRight} onClick={handleFinish}>
            Confirm All &amp; Preview
          </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ── Multi-image dropzone for the OCR document-upload path ───────────────────
// Two modes, same underlying entries array ({ id, file, previewUrl, photo,
// photoPreviewUrl }) either way — mode only changes how entries get added:
//  - 'single': the original flow — one document at a time ("+ Add User"),
//    with its own optional photo attached right there, per row.
//  - 'bulk': a true multi-select for documents (adds every picked file at
//    once, in selection order) and a second multi-select for photos, which
//    fills the entries' empty photo slots in order — the Nth photo picked
//    goes to the Nth entry that doesn't have one yet. Both still collapse to
//    the same flat `files[]` array bulk-upload/documents expects (1 image =
//    1 user) when submitted — see handleUploadDocuments for how photos are
//    then matched back to the real batch_user_ids once upload confirms
//    which documents actually succeeded.
const UserDocumentEntries = ({ mode, entries, onEntriesChange }) => {
  const singleDocInputRef = useRef(null);
  const bulkDocInputRef = useRef(null);
  const bulkPhotoInputRef = useRef(null);
  const photoInputRefs = useRef({});
  const viewDocInputRef = useRef(null);
  const viewPhotoInputRef = useRef(null);
  const [viewEntryId, setViewEntryId] = useState(null);
  const viewEntry = entries.find((e) => e.id === viewEntryId) || null;

  const makeEntry = (file) => ({
    id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), photo: null, photoPreviewUrl: null,
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onEntriesChange((prev) => [...prev, makeEntry(file)]);
    e.target.value = '';
  };

  const handleBulkFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onEntriesChange((prev) => [...prev, ...files.map(makeEntry)]);
    e.target.value = '';
  };

  // Fills each entry without a photo yet, in order, one selected file per slot.
  const handleBulkPhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) { e.target.value = ''; return; }
    onEntriesChange((prev) => {
      const next = [...prev];
      let fileIdx = 0;
      for (let i = 0; i < next.length && fileIdx < files.length; i += 1) {
        if (!next[i].photo) {
          next[i] = { ...next[i], photo: files[fileIdx], photoPreviewUrl: URL.createObjectURL(files[fileIdx]) };
          fileIdx += 1;
        }
      }
      return next;
    });
    e.target.value = '';
  };

  const setEntryPhoto = (id, file) => {
    onEntriesChange((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      if (entry.photoPreviewUrl) URL.revokeObjectURL(entry.photoPreviewUrl);
      return { ...entry, photo: file, photoPreviewUrl: file ? URL.createObjectURL(file) : null };
    }));
  };

  // Replaces the document itself (not the photo) — used by the View Detail
  // popup's "Replace Document" control.
  const setEntryFile = (id, file) => {
    if (!file) return;
    onEntriesChange((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      URL.revokeObjectURL(entry.previewUrl);
      return { ...entry, file, previewUrl: URL.createObjectURL(file) };
    }));
  };

  const removeEntry = (id) => {
    onEntriesChange((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.photoPreviewUrl) URL.revokeObjectURL(target.photoPreviewUrl);
      }
      return prev.filter((entry) => entry.id !== id);
    });
  };

  return (
    <div>
      <input ref={singleDocInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={bulkDocInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkFilesChange} />
      <input ref={bulkPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkPhotosChange} />

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-8 text-center">
          <FileImage size={20} className="text-gray-300" />
          <p className="max-w-[220px] font-inter text-xs text-gray-400">
            {mode === 'bulk'
              ? 'Select every document at once below — photo attachment is optional.'
              : "Add each person's document one at a time — 1 document = 1 user."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <img src={entry.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-inter text-xs font-semibold text-brand-dark">User {i + 1}</p>
                <p className="truncate font-inter text-[11px] text-gray-400">{entry.file.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setViewEntryId(entry.id)}
                title="View document and photo"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 font-inter text-[10px] font-semibold text-gray-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                <Eye size={11} /> View Detail
              </button>

              {/* Photo slot — optional, per entry. Bulk mode's "Select
                  Photos" picker auto-fills these; single mode fills them
                  one at a time right here. */}
              {entry.photo ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <img src={entry.photoPreviewUrl} alt="" className="h-8 w-8 rounded-full border border-gray-100 object-cover" title={entry.photo.name} />
                  <button type="button" onClick={() => setEntryPhoto(entry.id, null)} title="Remove photo" className="text-gray-300 transition-colors hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => photoInputRefs.current[entry.id]?.click()}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 font-inter text-[10px] font-semibold text-gray-500 transition-colors hover:border-brand-blue hover:text-brand-blue"
                  >
                    <Camera size={11} /> Photo
                  </button>
                  <input
                    ref={(el) => { photoInputRefs.current[entry.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setEntryPhoto(entry.id, f); }}
                  />
                </>
              )}

              <button type="button" onClick={() => removeEntry(entry.id)} title="Remove document" className="shrink-0 text-gray-300 transition-colors hover:text-red-500">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 'bulk' ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => bulkDocInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 py-3 font-inter text-sm font-semibold text-brand-blue transition-colors hover:border-brand-blue hover:bg-blue-50/40"
            >
              <Plus size={14} /> Select Documents
            </button>
            <button
              type="button"
              disabled={entries.length === 0}
              onClick={() => bulkPhotoInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 py-3 font-inter text-sm font-semibold text-brand-blue transition-colors hover:border-brand-blue hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Camera size={14} /> Select Photos
            </button>
          </div>
          <p className="mt-1.5 font-inter text-[11px] text-gray-400">
            Photos are matched to documents in the order each was selected — pick photos in the same order as the documents above.
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => singleDocInputRef.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 py-3 font-inter text-sm font-semibold text-brand-blue transition-colors hover:border-brand-blue hover:bg-blue-50/40"
        >
          <Plus size={14} /> Add User
        </button>
      )}

      {/* Document + photo side by side, each with its own edit control right
          there — replace the document, or add/replace/remove the photo —
          without closing the popup and hunting for the row again. */}
      <input
        ref={viewDocInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && viewEntryId) setEntryFile(viewEntryId, f); }}
      />
      <input
        ref={viewPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && viewEntryId) setEntryPhoto(viewEntryId, f); }}
      />
      <Modal isOpen={!!viewEntry} onClose={() => setViewEntryId(null)} title="Document & Photo" size="lg">
        {viewEntry && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-inter text-[11px] font-semibold uppercase tracking-wide text-gray-400">Document</p>
              <img src={viewEntry.previewUrl} alt="" className="w-full rounded-xl border border-gray-100 object-contain max-h-[50vh]" />
              <p className="mt-1.5 truncate font-inter text-xs text-gray-500">{viewEntry.file.name}</p>
              <button
                type="button"
                onClick={() => viewDocInputRef.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 font-inter text-xs font-semibold text-gray-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                <RefreshCw size={11} /> Replace Document
              </button>
            </div>
            <div>
              <p className="mb-2 font-inter text-[11px] font-semibold uppercase tracking-wide text-gray-400">Photo</p>
              {viewEntry.photo ? (
                <>
                  <img src={viewEntry.photoPreviewUrl} alt="" className="w-full rounded-xl border border-gray-100 object-contain max-h-[50vh]" />
                  <p className="mt-1.5 truncate font-inter text-xs text-gray-500">{viewEntry.photo.name}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => viewPhotoInputRef.current?.click()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 font-inter text-xs font-semibold text-gray-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
                    >
                      <RefreshCw size={11} /> Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryPhoto(viewEntry.id, null)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 py-1.5 font-inter text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-center">
                    <Camera size={20} className="text-gray-300" />
                    <p className="max-w-[180px] font-inter text-xs text-gray-400">No photo attached yet</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => viewPhotoInputRef.current?.click()}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 font-inter text-xs font-semibold text-brand-blue transition-colors hover:border-brand-blue hover:bg-blue-50/40"
                  >
                    <Camera size={11} /> Add Photo
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export const DownloadTemplate = () => {
  const navigate  = useNavigate();
  const inputRef  = useRef(null);
  const { selectedIndustry, selectedPermission, selectedVerifications, setBatchData, setSelectedHumanTemplate } = useApp();

  const [excelFile,      setExcelFile]      = useState(null);
  const [customFields,   setCustomFields]   = useState([]);
  const [fieldInput,     setFieldInput]     = useState('');
  const [modalOpen,      setModalOpen]      = useState(false);
  const [downloading,    setDownloading]    = useState(false);
  const [baseToggles,    setBaseToggles]    = useState({
    full_name: true, email: true, phone_number: true,
    dob: true, aadhar_number: true, pan_number: true,
    dl_number: true, gender: true, nationality: true,
  });
  const [batchNameValue, setBatchNameValue] = useState(() => {
    const d = new Date();
    return `Human Verification Batch ${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  });

  // 'single' | 'bulk' — only controls how entries get added in
  // UserDocumentEntries; submission always goes through the same bulk
  // documents call either way (see handleUploadDocuments).
  const [uploadMode, setUploadMode] = useState('single');
  const [docEntries, setDocEntries] = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [ocrResult,  setOcrResult]  = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewEntries, setReviewEntries] = useState({});
  const entriesRef = useRef(docEntries);
  entriesRef.current = docEntries;

  useEffect(() => () => {
    entriesRef.current.forEach((entry) => {
      URL.revokeObjectURL(entry.previewUrl);
      if (entry.photoPreviewUrl) URL.revokeObjectURL(entry.photoPreviewUrl);
    });
  }, []);

  // Switching tabs is a fresh start — the two modes build their entries
  // differently enough (one-at-a-time vs multi-select) that carrying partial
  // state across would be confusing, not helpful. Revoke every blob URL
  // before clearing so nothing leaks (UserDocumentEntries only revokes on
  // its own unmount, not when the parent swaps its entries array out).
  const switchUploadMode = (nextMode) => {
    if (nextMode === uploadMode) return;
    docEntries.forEach((entry) => {
      URL.revokeObjectURL(entry.previewUrl);
      if (entry.photoPreviewUrl) URL.revokeObjectURL(entry.photoPreviewUrl);
    });
    setDocEntries([]);
    setUploadMode(nextMode);
  };

  const toggleBase = (key) => setBaseToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectedVerificationTypes = getVerificationApiTypes(selectedVerifications);
  const templateHeaders = useMemo(
    () => [
      ...BASE_FIELDS.filter((f) => baseToggles[f.key]).map((f) => f.key),
      ...customFields,
    ],
    [baseToggles, customFields]
  );

  const handleAddField = () => {
    const key = sanitizeKey(fieldInput);
    if (!key) { toast.error('Enter a valid field name'); return; }
    if (templateHeaders.includes(key)) { toast.error('Field already exists'); return; }
    setCustomFields((prev) => [...prev, key]);
    setFieldInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } };

  const handleRemoveField = (key) => setCustomFields((prev) => prev.filter((f) => f !== key));

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await verificationAPI.generateHumanTemplate(templateHeaders, selectedVerificationTypes);
      triggerBlobDownload(data, 'trumarkz-human-template.xlsx');
      toast.success('Template downloaded');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to download template'));
    } finally {
      setDownloading(false);
    }
  };

  const handleExcelSubmit = async () => {
    try {
      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook   = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet  = workbook.Sheets[workbook.SheetNames[0]];
      const rows       = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Validate columns right here — the backend only checks this at final
      // submit (Preview step), which is too late to be useful; catching it
      // immediately on upload lets the org fix the file before going any
      // further through Costing/Preview.
      // Some headers carry a format hint from the generated template (e.g.
      // "DOB (YYYY-MM-DD)" sanitizes to "dob_yyyy_mm_dd") — match by prefix,
      // not exact equality, so those still count as present.
      const uploadedHeaders = (Array.isArray(rows[0]) ? rows[0] : []).map(sanitizeKey).filter(Boolean);
      const missingHeaders = templateHeaders.filter(
        (h) => !uploadedHeaders.some((u) => u === h || u.startsWith(`${h}_`))
      );
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const recordCount = rows
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .length;
      if (recordCount <= 0) { toast.error('The uploaded file has no data rows'); return; }
      setBatchData({
        file: excelFile, batchName: batchNameValue,
        description: '', recordCount, templateHeaders,
        fileName: excelFile.name, costConfirmed: false, uploadResponse: null,
      });
      setSelectedHumanTemplate('classic-blue');
      navigate('/org/costing');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to read the uploaded file'));
    }
  };

  // Extraction reads each document independently; it creates no batch.
  const handleUploadDocuments = async () => {
    if (!docEntries.length) { toast.error('Add at least one user document'); return; }
    if (!batchNameValue.trim()) { toast.error('Enter a batch name'); return; }
    setUploading(true);
    try {
      const records = await extractOcrDraft(docEntries, verificationAPI);
      setReviewEntries(Object.fromEntries(docEntries.map((entry) => [entry.id, entry])));
      setOcrResult({ successful_users: records, errors: [], skipped_users: [] });
      setReviewOpen(true);
    } catch (err) {
      toast.error(getApiError(err, err?.message || 'Failed to extract document details'));
    } finally {
      setUploading(false);
    }
  };

  const handleReviewDone = (draft) => {
    setReviewOpen(false);
    setBatchData({
      batchName: batchNameValue.trim(), description: '', recordCount: draft.records.length,
      costConfirmed: false, uploadResponse: null, ocrDraft: draft,
      ocrSubmission: { response: null, completedIds: [], photoSavedIds: [], savedAttachments: {} },
    });
    setSelectedHumanTemplate('classic-blue');
    navigate('/org/costing');
  };

  // Excel and Documents sit side-by-side — Continue uses whichever one the
  // org actually filled in. Excel takes priority if both happen to have data.
  const handleContinue = () => {
    if (excelFile) return handleExcelSubmit();
    if (docEntries.length > 0) return handleUploadDocuments();
    toast.error('Upload an Excel file or add document images to continue');
  };

  return (
    <AuthLayout title="Upload Batch">
      <div className="w-full mx-auto lg:max-w-none">
        <StepWizard
          steps={HUMAN_VERIFICATION_STEPS}
          currentStep={HUMAN_VERIFICATION_STEP_META.template.currentStep}
          stepRoutes={HUMAN_VERIFICATION_STEP_ROUTES}
        />
        <PageHeader
          title="Upload Verification Data"
          subtitle="Fill in the Excel template or upload document images — whichever you use, then continue."
          action={
            <Button variant="outline" size="sm" icon={Download} onClick={() => setModalOpen(true)}>
              Download Template
            </Button>
          }
        />

        <div>
          <Card className="overflow-hidden border border-gray-100 p-0">

            {/* ══ TOP — Batch Name (full width) ══════════════════════════ */}
            <div className="border-b border-gray-100 bg-gray-50/60 px-8 py-6">
              <label className="mb-1.5 block font-inter text-xs font-semibold uppercase tracking-widest text-gray-400">
                Batch Name
              </label>
              <input
                value={batchNameValue}
                onChange={(e) => setBatchNameValue(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-inter text-sm font-medium text-brand-dark outline-none transition-all placeholder:text-gray-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                placeholder="e.g. Healthcare Batch June 2026"
              />
            </div>

            {/* ══ BODY — Two columns ══════════════════════════════════════ */}
            <div className="flex min-h-0 flex-col lg:flex-row">

              {/* ── LEFT — Excel Template ──────────────────────────────── */}
              <div className="flex w-1/2 shrink-0 flex-col border-b border-gray-100 bg-gray-50/30 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50/60 px-6 py-4">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${excelFile ? 'bg-green-100' : 'bg-blue-50'}`}>
                    <Upload size={13} className={excelFile ? 'text-green-600' : 'text-brand-blue'} />
                  </div>
                  <div>
                    <p className="font-inter text-sm font-semibold text-brand-dark">Excel Template</p>
                    <p className="font-inter text-[11px] text-gray-400">.xlsx · Max 5 MB</p>
                  </div>
                  {excelFile && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-inter text-[10px] font-bold text-green-700">
                      <CheckCircle size={10} /> Ready
                    </span>
                  )}
                </div>

                <div className="border-b border-gray-100 p-6">
                  <FileUpload
                    label="Completed Excel file (.xlsx)"
                    fileType="xlsx"
                    accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
                    selectedFile={excelFile}
                    onFileSelect={setExcelFile}
                    onRemove={() => setExcelFile(null)}
                  />
                </div>

                <div className="flex-1 space-y-3 p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <p className="font-sora text-2xl font-bold text-brand-dark">{templateHeaders.length}</p>
                      <p className="mt-0.5 font-inter text-[11px] text-gray-400">Columns</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                      <p className="font-sora text-2xl font-bold text-brand-dark">{customFields.length}</p>
                      <p className="mt-0.5 font-inter text-[11px] text-gray-400">Custom Fields</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-widest text-gray-400">Checklist</p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Batch name set',      done: Boolean(batchNameValue.trim()) },
                        { label: 'Excel file uploaded', done: Boolean(excelFile) },
                      ].map(({ label, done }) => (
                        <div key={label} className="flex items-center gap-2.5">
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {done
                              ? <CheckCircle size={10} className="text-green-600" />
                              : <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
                          </div>
                          <span className={`font-inter text-xs ${done ? 'text-brand-dark' : 'text-gray-400'}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT — Upload Documents (OCR) ────────────────────── */}
              <div className="flex-1 bg-gray-50">
                <div className="flex items-center gap-2.5 border-b border-gray-200 bg-white px-6 py-4">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${docEntries.length > 0 ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <FileImage size={13} className={docEntries.length > 0 ? 'text-green-600' : 'text-brand-blue'} />
                  </div>
                  <div>
                    <p className="font-inter text-sm font-semibold text-brand-dark">Upload Documents</p>
                    <p className="font-inter text-[11px] text-gray-500">OCR extracts each user from their document image</p>
                  </div>
                  {docEntries.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 font-inter text-[10px] font-bold text-green-700">
                      <CheckCircle size={10} /> Ready
                    </span>
                  )}
                </div>

                {/* Single: add one document (+ optional photo) at a time.
                    Bulk: multi-select every document at once, then multi-
                    select every photo at once — matched in selection order. */}
                <div className="flex items-center gap-1.5 border-b border-gray-100 bg-white px-6 pt-3">
                  <button
                    type="button"
                    onClick={() => switchUploadMode('single')}
                    className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-inter text-xs font-semibold transition-colors ${uploadMode === 'single' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <Layers size={13} /> Single
                  </button>
                  <button
                    type="button"
                    onClick={() => switchUploadMode('bulk')}
                    className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-inter text-xs font-semibold transition-colors ${uploadMode === 'bulk' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <Images size={13} /> Bulk
                  </button>
                </div>

                <div className="border-b border-gray-100 p-6">
                  <UserDocumentEntries mode={uploadMode} entries={docEntries} onEntriesChange={setDocEntries} />
                </div>

                <div className="space-y-3 p-6">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                    <p className="font-sora text-2xl font-bold text-brand-dark">{docEntries.length}</p>
                    <p className="mt-0.5 font-inter text-[11px] text-gray-400">Users Added</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-widest text-gray-400">Checklist</p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Batch name set',   done: Boolean(batchNameValue.trim()) },
                        { label: 'Users added',      done: docEntries.length > 0 },
                      ].map(({ label, done }) => (
                        <div key={label} className="flex items-center gap-2.5">
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {done
                              ? <CheckCircle size={10} className="text-green-600" />
                              : <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
                          </div>
                          <span className={`font-inter text-xs ${done ? 'text-brand-dark' : 'text-gray-400'}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ══ BOTTOM — Back / Continue (full width) ══════════════════ */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-white px-8 py-5 sm:flex-row">
              <Button variant="outline" size="lg" className="w-full sm:flex-1" onClick={() => navigate('/org/permissions')}>
                Back
              </Button>
              <Button
                variant="primary" size="lg" className="w-full sm:flex-1"
                onClick={handleContinue}
                disabled={uploading}
                icon={uploading ? RefreshCw : ArrowRight}
              >
                {uploading ? 'Uploading & scanning…' : 'Continue'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Download Template Modal ─────────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Setup Template" size="2xl">
        <div className="space-y-5">

          {/* Intro */}
          <p className="font-inter text-sm text-slate-500">
            Add any custom columns you need. Base fields are always included. Click Download when ready.
          </p>

          {/* Base fields — all toggleable */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Base Fields
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BASE_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-inter text-xs font-medium text-slate-800 truncate">{field.label}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate">
                      {field.key}{field.hint ? ` · ${field.hint}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBase(field.key)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      baseToggles[field.key] ? 'bg-brand-blue' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        baseToggles[field.key] ? 'translate-x-[18px]' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add custom field input */}
          <div>
            <p className="font-inter text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Custom fields
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={fieldInput}
                onChange={(e) => setFieldInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. employee_id"
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 font-inter text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all"
              />
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAddField}>
                Add
              </Button>
            </div>
            <p className="font-inter text-[11px] text-slate-400 mt-1.5">
              Use snake_case — press Enter or click Add.
            </p>
          </div>

          {/* Added custom fields */}
          {customFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customFields.map((field) => (
                <span
                  key={field}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-inter text-sm text-slate-700"
                >
                  {field}
                  <button
                    type="button"
                    onClick={() => handleRemoveField(field)}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Final columns summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <p className="font-inter text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Final columns ({templateHeaders.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {templateHeaders.map((col) => (
                <span
                  key={col}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-inter text-[11px] font-medium text-slate-600"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              icon={downloading ? RefreshCw : Download}
              disabled={downloading}
              onClick={handleDownload}
            >
              {downloading ? 'Downloading…' : 'Download Template'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── OCR Review Modal ─────────────────────────────────────────────────── */}
      <ReviewOcrModal
        isOpen={reviewOpen}
        ocrResult={ocrResult}
        sourceEntries={reviewEntries}
        onClose={() => setReviewOpen(false)}
        onDone={handleReviewDone}
      />
    </AuthLayout>
  );
};

export default DownloadTemplate;
