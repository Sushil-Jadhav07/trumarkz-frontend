# Conditional Phone Number requirement for Human creation

Updated: 30 October 2026. Frontend implementation only; no backend changes, commit, push or deployment.

## Behavior

- Human + Permission Required: Phone Number is mandatory, with a red asterisk, a required input attribute and inline validation. Missing or malformed numbers block confirmation/creation.
- Open Human: a missing number/column is allowed. A provided number must still match the accepted format.
- Product/Warranty: no new phone requirement or validation is applied.
- Validation removes spaces, dashes, dots, round/square brackets, then requires an optional leading `+` and 10–15 digits. It does not remove arbitrary characters to make an invalid number pass.
- The same rules apply to the Human 5-QR schema because it uses the shared Single/Excel/OCR creation paths; no schema-variant exception bypasses validation.

## Organization defaults

Read-only inspection of the configured backend's public OpenAPI confirms `/auth/me` includes `permission_mode`. AuthContext now carries that existing response field as `permissionMode`; authentication endpoints and session handling are unchanged.

AppContext resolves a separate effective `humanPermission` from the organization's default unless the current operator explicitly selects a mode. Explicit Human choices are associated with the current account ID and survive refresh. An older unscoped/global preference does not silently override another organization's default. A missing/unrecognized default is conservatively Permission Required until an explicit Open choice or the actual Open default is available.

The existing Product/Warranty `selectedPermission` preference is retained. Human permission cards, Single/Bulk creation, template review and final costing use the effective Human mode. An explicit switch to Open immediately removes the mandatory phone marker/check; changing back revalidates the current data.

## Flow coverage

### Single

`SingleHumanModal` validates before calling the creation API. It no longer requires a phone unconditionally in Open mode. Inline errors are shown for local validation and backend errors identifying `phone_number`, including FastAPI field-location errors. Existing email/name requirements are not otherwise changed.

### Excel/CSV

Both the direct bulk panel and template wizard validate every populated row, ignoring fully blank rows. Supported aliases: `phone_number`, `phone`, `mobile`, `mobile_number`. Schema-mapped column names/aliases are also accepted. Required-column help names the column and aliases.

Phone validation is separate from the generic required-column check so valid alias headers are not rejected. The wizard carries resolved phone column names to costing, which repeats validation before the final creation POST; changing permission after an earlier Open validation cannot bypass the requirement. Phone errors appear beside the upload or submission action with affected spreadsheet row numbers.

### OCR

Every document review layout now has a Phone Number input: DL, Aadhaar, PAN and generic. Existing extraction aliases prefill it when available. Each holder has their own editable field and inline error; there is no “apply one phone to everyone” control.

Per-user confirmation, Confirm All, final preview and final submission validate the current permission. The final draft guard runs before batch/photo/document/review writes. Contact assignments are built from the final ordered record list, keeping the correct zero-based file index even after reordering:

```json
[
  { "file_indices": [0], "email": "first@example.test" },
  { "file_index": 0, "phone_number": "+91 98765 43210" },
  { "file_indices": [1], "email": "second@example.test" },
  { "file_index": 1, "phone_number": "9876543211" }
]
```

The serializer accepts `phone_number` only on a separate single-file `file_index` assignment, never a multi-holder demographic group. Email, gender and nationality retain their existing `file_indices` contract. Empty Open phone values are omitted. An assigned phone overrides the OCR-extracted value, as confirmed by the backend handoff. Existing demographic group rules, upload checkpoint retries and review/attachment handling remain intact.

## Confirmed backend contract and deployment limitation

The backend handoff confirms `assignments: [{file_index: 0, phone_number: "+919876543210"}]`. The frontend sends this exact per-file shape through the existing `assignments` JSON field in the same OCR creation request; no new endpoint or post-creation workaround was invented.

The **public OCR schema inspected before this confirmation still documented only gender, nationality and email assignment keys**. Its Single Human schema/description also still presented phone as required independently of permission. The backend confirms phone support locally but has not confirmed deployment. Live end-to-end success therefore still requires the updated backend environment; no live creation was submitted to probe an older deployment.

The frontend's per-holder/file mapping is covered by controlled tests. Those tests do not prove an older backend will persist the new phone field or accept an empty Open phone. Backend errors remain visible; there is no silent successful upload assumption for zero-created rows.

## Frontend files changed for this task

| File | Purpose |
| --- | --- |
| `src/utils/humanPhone.js` | Shared format/requirement/default resolution, Excel/draft guards and phone-error messages |
| `src/context/AuthContext.jsx` | Carry existing `permission_mode` profile metadata only |
| `src/context/AppContext.jsx` | Effective Human default and account-associated explicit override; preserve Product/Warranty preference |
| `src/pages/org/PermissionSettings.jsx` | Display effective Human selection and explain required contact fields |
| `src/pages/org/CreateBatch.jsx` | Conditional Single validation/labels; direct bulk validation/help/errors |
| `src/pages/org/DownloadTemplate.jsx` | Conditional template fields; per-file OCR phone inputs; Excel and review guards/errors |
| `src/pages/org/CostBreakdown.jsx` | Final phone revalidation and readable backend errors |
| `src/utils/ocrAssignments.js` | Validate/preserve singleton phone assignments |
| `src/utils/ocrSubmission.js` | Guard before creation and map each reviewed phone to its source file |
| `src/utils/humanPhone.test.js` | New phone/default/alias/guard/error regression cases |
| `src/utils/ocrAssignments.test.js` | Singleton phone and actual multipart preservation checks |
| `src/utils/ocrSubmission.test.js` | Phone-aware creation/reorder/checkpoint fixtures and assertions |
| `src/utils/humanEmail.test.js` | Supply a valid phone in the existing private email-success fixture |
| `docs/human-required-phone.md` | Implementation, changed files, tests and backend dependency |

Generated `dist/` assets are refreshed by the production build. Existing uncommitted certificate-access changes from earlier work are preserved and are not counted as new phone-requirement changes.

## Verification

- **170 automated tests passed**, covering format boundaries, separators, optional `+`, default/private/Open policy, entity isolation, all phone aliases, schema source columns, row numbers, OCR pre-write guards, file index zero, exact file ordering, multipart data and existing regressions.
- Isolated browser checks used the real creation/review/costing components and real AppContext, with test-only auth/API providers. Passed organization default Private, explicit Open, account change/default restoration, Single missing/invalid/valid numbers, backend field errors, direct Excel alias handling, wizard/costing permission-switch guards, schema-mapped Human 5-QR phone, two-holder OCR assignment mapping and OCR final-preview revalidation.
- Real mobile viewport checked at **390px** with no page overflow/runtime exceptions.
- Production build passed; existing bundle-size and Browserslist warnings remain.
- No real batch, OCR provider, email, credential authentication or protected-report mutation was submitted. No organization/holder authentication form was modified.

Commands:

```powershell
node --test src/utils/*.test.js src/lib/*.test.js src/components/shared/*.test.js src/services/*.test.js
npm run build
```

## Manual release checks

1. Use a test organization whose default is Permission Required. Without clicking a permission card, open each Human creation path; phone must show `*` and block blank/invalid values.
2. Switch to Open; blank phone must be permitted. Switch back; the current file/draft must revalidate.
3. Test `9876543210`, `+91 (98765) 43210` and a 15-digit value. Reject 9/16-digit values, letters, slashes and misplaced/multiple plus signs.
4. Upload private Excel with missing phone column, blank/invalid later row, each supported alias and a schema-mapped phone source. Repeat for the Human 5-QR schema.
5. Enter distinct phones for at least two OCR holders; confirm creation includes their exact indices and that the updated backend persists each person's phone. Retry follow-up saves and verify no duplicate batch.
6. Check Open Human, Product and Warranty independently. The existing organization-password and holder mobile/DOB access-authentication flows must behave as before.

Live OCR completion remains dependent on the compatible backend contract described above.
