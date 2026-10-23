# Human bulk Gender / Nationality integration

> Superseded: the newer `OCR_bulk_gender_nationality_api.md` removed Excel overrides. Current implementation is documented in [ocr-gender-nationality-assignments.md](./ocr-gender-nationality-assignments.md). The historical implementation below is no longer active; its controls, serializer and tests were replaced by OCR-only assignments.

Source: supplied `bulk_gender_nationality_api.md`, read in full before changes.

## Behavior

- Human Excel/CSV upload provides individual Male/Female/Other checkboxes and a comma-separated nationality input. Neither exposes an `All` option; the `All` keyword is rejected case-insensitively before submission.
- No selections omit the corresponding multipart field entirely. One distinct value overrides every Excel row and makes that column optional. Multiple distinct values, including manually selecting every gender, keep Excel values and require the column. Gender and nationality operate independently.
- Selections survive the existing upload → costing → create-batch flow. Only `POST /verification/bulk-upload` receives the single comma-joined `bulk_gender` and `bulk_nationality` text fields. Existing industry, verification types, visibility, file and template metadata remain intact. OCR, single-record, Product and Warranty endpoint payloads do not receive these fields.
- The wizard now accepts `.csv` alongside `.xlsx`. Its header validation reflects the single-value overrides; it does not rewrite Excel cells or validate existing free-text gender/nationality values. OCR review still requires its original per-person fields.
- Post-upload review uses `successful_users[].gender` and `.nationality` directly. It never predicts saved values from selections or makes a follow-up call. Skipped rows/errors remain visible and an all-failed upload does not claim successful creation. The existing direct Human upload panel also displays the returned values.
- Record Detail already displays `custom_fields`; its generic `custom_fields`-means-Product shortcut was removed so Human gender/nationality custom fields do not misclassify a Human record. The existing authenticated snapshot supplies the canonical batch type for classification.

## Nationality list limitation

The supplied document explicitly omits the 195-entry `NATIONALITY_OPTIONS` constant and offers no runtime list endpoint. The exact source list was requested, rather than guessed or replaced with country names. Until supplied, nationality uses comma-separated demonym entry (for example `Indian,American`) with authoritative backend validation and the existing visible HTTP-error handling. This supports all backend-supported demonyms without fabricating a supposedly synchronized dropdown list. The exact canonical dropdown remains dependent on receiving that constant.

## Validation

- 87 automated tests passed: existing regressions plus independent override counts, whitespace/case/duplicate normalization, no special all-values behavior, `All` rejection, omitted empty fields, one-field comma encoding, actual upload-helper scoping and unchanged server results.
- Isolated browser tests used the real Upload Template and Cost Breakdown components with controlled backend responses. Single, multiple, empty and all-three-gender selections passed CSV upload → header validation → costing → one upload → server-confirmed values. Single overrides accepted a CSV omitting both optional columns. Invalid `All` caused no upload; a backend nationality error preserved the cost/upload flow instead of showing success.
- Mobile 390px overflow and screenshot checked. Production build passed. No real batch was uploaded during tests; backend deployment and persisted real-data outcomes still require environment verification.
