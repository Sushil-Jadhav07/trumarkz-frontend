# TruMarkZ — Product Requirements Document

| Document field | Value |
| --- | --- |
| Version | 1.0 |
| Prepared | 28 October 2026 |
| Status | Draft for product, engineering and QA review |
| Product | TruMarkZ web platform |
| Repository | `trumarkz-frontend` |
| Evidence basis | Current frontend routes, components, API helpers, utilities and integration notes |
| Product owner / approver | To be assigned |
| Engineering and QA owners | To be assigned |
| Release date / budget | Not defined |

## 1. Purpose and interpretation

This PRD describes the product represented by the current TruMarkZ frontend and the requirements needed to operate it reliably. It covers organizations, individuals, Super Admins, verification recipients and external verifiers. It is intended for scope agreement, implementation planning, QA and operational handoff.

The repository is the evidence source for current frontend behavior. Backend deployment, provider operation, email delivery and production availability were not independently established while preparing this document. This is not a backend database specification or a production certification.

The following labels distinguish evidence from intended behavior:

| Label | Meaning |
| --- | --- |
| Integrated frontend | The inspected source contains API integration and related UI; live service success is not implied. |
| Partial / demonstration | A route or screen exists but uses sample data, simulated actions or incomplete integration. |
| Inactive | Source files exist but active application routes do not expose the flow. |
| Required | Intended acceptance requirement; may need verification or additional implementation. |
| Proposed | Planning recommendation needing product approval, not an existing promise. |
| Open | Contract, policy or business decision is unresolved. |

“Must” statements below define required behavior. They should not be read as proof that every requirement already passes end-to-end testing. The implementation inventory, acceptance matrix and gap register identify the distinction.

## 2. Product overview

TruMarkZ is a web platform for collecting records and supporting documents, coordinating verification, tracking outcomes and accessing issued credentials. Its primary operating model is batch based: an organization submits people or products, Super Admin coordinates processing, and results become available through record, batch and certificate views.

The platform includes three related domains:

1. **Human verification:** industry-specific checks, Excel/CSV or OCR intake, Open Search or Permission Required policy, manual and automatic verification, reports and SDC workflows.
2. **Product verification and warranty:** product metadata and images, authenticity/compliance verification, serial-linked warranty records, supporting documents and administrative decisions.
3. **Individual skills:** individual registration, skill-tree entries and evidence, administrative review and external skill-verifier reports.

Supporting capabilities include authentication, organization onboarding, account administration, verifier management, email templates/history, notifications and certificate access.

### 2.1 Problems addressed

- Organizations need one workflow for submitting multiple records with several required checks.
- People must be able to grant or decline required permission before processing starts.
- Administrators need to separate completed checks from pending work and assign the correct people to appropriate verifiers.
- External verifiers need a secure, limited-scope way to upload reports and record decisions.
- OCR extraction needs human correction, including email information absent from identity documents.
- Failed or incomplete automatic checks need controlled recovery without repeating completed checks.
- Users need clear distinctions between an uploaded document, a completed check, a generated certificate and a shared certificate.

### 2.2 Goals

| Goal | Desired outcome |
| --- | --- |
| Reduce submission effort | Reusable templates, OCR-assisted intake and bulk demographic assignment reduce repeated entry. |
| Respect consent | Permission Required Human records cannot enter processing before accepted consent. |
| Improve operational clarity | Batch and check-level state identify pending, completed, failed and blocked work. |
| Prevent incorrect attribution | Documents, reports, emails and decisions remain attached to the correct record. |
| Support recovery | Users can recover from partial saves, unavailable reports and provider failures without duplicate batches. |
| Deliver usable credentials | Eligible results can progress through issuance and be viewed or downloaded. |
| Maintain organization isolation | Organizations access only authorized data and notifications. |

### 2.3 Scope exclusions

The following are not commitments of this PRD’s current release baseline:

- A production payment gateway, wallet ledger or funds reconciliation.
- A marketplace purchasing workflow: marketplace routes are commented out in `App.jsx`.
- A verified blockchain anchoring implementation or legal/compliance certification. UI copy mentioning blockchain is not evidence of a working anchoring service.
- Native mobile applications.
- New backend endpoints or database fields inferred from frontend needs.
- Guaranteed email, push, provider or SDC delivery times without agreed service objectives.
- Fully persistent OCR draft recovery after a browser reload; current files and submission checkpoints are held in application memory.

## 3. Users and authorization

### 3.1 Personas

| Persona | Primary job | Main surfaces |
| --- | --- | --- |
| Organization operator | Submit Human/Product/Warranty batches and retrieve results | Organization dashboard, creation wizard, batches, record details, certificates |
| Human subject | Decide whether requested verification may proceed | Public token-based consent page |
| Super Admin | Manage accounts, checks, assignments, reports and issuance | Admin dashboard, Batch Monitor, organization/user lists, verifiers, drafts, review tools |
| External manual verifier | Review assigned records, upload reports and approve/reject | Public manual-upload link |
| Individual | Maintain a skill tree and supporting evidence | Individual dashboard, Skill Tree, All Skills |
| External skill verifier | Return evidence and a decision for an invited skill | Public skill-upload link |

The Human subject and external verifiers are scoped token-link participants, not additional authenticated account roles established by the current frontend.

### 3.2 Required access matrix

| Capability | Organization | Individual | Super Admin | Public token participant |
| --- | --- | --- | --- | --- |
| Manage own profile | Own account | Own account | Own account | No |
| Create organization batches | Own organization | No | Only if explicitly authorized by backend/workflow | No |
| Inspect organization batches | Own organization | No | Across authorized organizations | Only token-assigned context |
| Manage organization/user accounts | No | No | Yes | No |
| Manage verifier directory and templates | No | No | Yes | No |
| Send verification assignments | No general admin entitlement | No | Eligible records/checks | No |
| Retry automatic verification | No | No | Eligible Human automatic records | No |
| Decide Human consent | No action on another person's behalf | No action on another person's behalf | No bypass | Holder of the relevant consent link |
| Submit a manual report/decision | No general entitlement | No | Through authorized workflow | Relevant manual token only |
| Maintain individual skills | No | Own skills | Administrative review/access | Relevant skill token only |
| Read organization notifications | Own organization | Not established | Not the organization recipient by default | No |

**AUTH-01 — Server authority:** Backend authorization must apply to every protected request; navigation visibility is not access control.

**AUTH-02 — Route enforcement:** Protected pages must reject unauthorized direct navigation. Current explicit `ProtectedRoute`/`AdminRoute` coverage is strongest on admin routes; several wizard/account/individual detail routes are not individually wrapped. A route-access review remains a release requirement.

**AUTH-03 — Public links:** Consent and verifier links must work without a logged-in account and must not inherit an unrelated account’s authorization header.

**AUTH-04 — Tenant isolation:** Organization ownership must be validated server side. Changing a batch, record or notification ID must never grant cross-organization access.

## 4. Information architecture and implementation inventory

| Area | Primary routes | Observed status |
| --- | --- | --- |
| Authentication | `/login`, `/signup`, `/forgot-password`, `/reset-password`, OAuth callback routes | Integrated frontend |
| Registration/onboarding | Organization/individual signup, `/verify-otp`, `/org/onboarding` | Integrated frontend |
| Human creation | `/org/industry`, `/org/verifications`, `/org/permissions`, `/org/template`, `/org/costing`, `/org/create-batch` | Integrated frontend; actual primary upload creation occurs at cost confirmation |
| Organization tracking | `/org/batch-status`, `/org/batch-status/:batchId`, `/org/record/:id` | Integrated frontend |
| Product creation | `/org/product/sector`, `/service`, `/verifications`, `/template`, `/costing` under the product prefix | Integrated frontend |
| Warranty | `/org/product/warranty`, `/org/batch-status/warranty/:batchId` | Integrated frontend |
| Consent | `/consent/:token`, `/verification/consent/:token` | Integrated public frontend |
| Manual reports | `/verification/manual/upload/:token`, `/upload` | Integrated public frontend; token context required for real operations |
| Admin operations | `/admin/dashboard`, `/admin/batch-monitor`, `/admin/batch-monitor/:batchId` | Integrated frontend |
| Account administration | `/admin/user-list`, `/admin/organizations`, organization detail/edit routes | Integrated frontend |
| Verifiers and email | `/admin/verifiers`, `/admin/email-drafts` | Integrated frontend |
| SDC administration | `/admin/sdc-verification` | Active route; currently hidden from the sidebar |
| Warranty/skill review | `/admin/product-warranty`, `/admin/skills-management` | Integrated frontend |
| Individual skills | `/individual/dashboard`, `/individual/skill-tree`, `/individual/skill-tree/build`, `/individual/all-skills` | Integrated frontend |
| Individual credentials/share | `/individual/credentials`, `/individual/share` | Partial / demonstration: sample credentials and a hardcoded share URL |
| Certificates | `/qr/reports`, `/qr/report/:id` | SDC API-backed list and detail |
| QR scanner/result | `/qr/scan`, `/qr/result` | Demonstration: timed scan simulation and sample result |
| Notifications/profile | `/account/notifications`, `/account/profile` | Integrated frontend; push depends on runtime configuration |
| Wallet/activity/support | `/account/wallet`, `/account/activity`, `/account/support` | Demonstration balance/activity and local support-submit feedback |
| Marketplace and separate credential builders | Source files under marketplace/credential folders | Marketplace routes inactive; unregistered files are not treated as shipped features |

Source references: [App routes](../src/App.jsx), [Sidebar](../src/components/layout/Sidebar.jsx), [API helpers](../src/services/api.js).

## 5. End-to-end journeys

### 5.1 Human batch through Excel/CSV

1. Organization operator signs in and completes required account setup.
2. Chooses Human verification, industry and one or more available verification types.
3. Selects Open Search or Permission Required.
4. Downloads/configures the template, completes record rows and uploads the workbook or CSV.
5. Frontend validates required headers and populated rows, including conditional email requirements.
6. Reviews selected checks, record count and total cost; explicitly agrees.
7. Cost confirmation submits the creation request. A mere file selection does not create the batch in this wizard.
8. The batch appears in authorized organization/admin views with actual server outcomes and skipped-row details where returned.
9. Permission Required subjects receive backend consent requests. Only accepted subjects become processing eligible.
10. Manual or automatic checks complete, reports become available and eligible records proceed to certificate generation/issuance.

### 5.2 Human batch through OCR

1. Operator follows the same industry/check/permission setup.
2. Adds document images through Single or Bulk controls, with optional photos/supporting documents.
3. Selects individual rows or All users, applies Gender/Nationality to the intended subset, and repeats for other subsets.
4. Preview extraction reads documents without creating a batch.
5. Operator reviews each extracted record, corrects fields and enters each person’s email where required.
6. Final preview and costing validate the current permission policy again.
7. One creation request sends ordered source files, metadata, demographic assignments and each provided per-file email.
8. The creation response is checkpointed before follow-up photos, attachments and reviewed-field saves.
9. A failed follow-up save retries against the created batch rather than repeating creation.

### 5.3 Consent and processing

1. Subject opens the email link, including in a signed-out/incognito session.
2. Page fetches token-scoped request context and displays identity, organization, batch and deadline from the response.
3. Subject allows or rejects the request.
4. Page displays the confirmed terminal decision and removes decision controls.
5. Backend schedules eligible automatic work following acceptance; frontend observes results through authenticated record/batch APIs.
6. Super Admin cannot bypass pending, rejected or expired consent by sending email assignments, generating certificates or invoking retry.

### 5.4 Super Admin manual verification

1. Opens Batch Monitor, locates the batch and reviews its records/checks.
2. Opens Bulk Send to Verifiers and selects an appropriate verifier for a pending check.
3. When one distinct verifier is selected and reuse is appropriate, applies that verifier to all checks from the button beside Edit Default Template.
4. Adjusts allocations and templates; every relevant user/check is assigned exactly once within the intended send scope.
5. System sends the supported assignment request. Completed checks and consent-ineligible users are omitted/blocked.
6. External verifier opens the secure link, uploads matched reports, stages decisions and submits.
7. Fresh server evidence determines which approvals are safe; staged filenames alone never authorize an approval.

### 5.5 Automatic failure recovery

1. Super Admin opens a Human record whose automatic check has no report and no final decision.
2. UI confirms current consent and check state.
3. Admin clicks Retry Automatic Verification once.
4. API returns scheduled/already-in-progress status; the UI remains in a waiting state rather than claiming report completion.
5. Bounded sequential reads refresh the actual report state; success, error and timeout are clearly distinct.
6. A generated report or final automatic decision disables retry.

## 6. Functional requirements

### 6.1 Registration, authentication and profiles

**ACC-01:** Support organization and individual signup, email/OTP verification, password login, forgot/reset password and the existing Google authentication flows.

**ACC-02:** Resolve the authenticated role from backend identity. Role selection or local storage must not create a Super Admin entitlement.

**ACC-03:** Load current profile, account status and onboarding information; expose applicable profile editing and organization GST verification actions through their supported APIs.

**ACC-04:** Maintain organization Dhiway space/schema associations and default selection through supported profile/admin actions. Multiple configured spaces must not be conflated.

**ACC-05:** Logout clears authentication, detaches session listeners and attempts bounded cleanup of the current user’s push registration. Cleanup failure must not trap the user in a logged-in state.

**ACC-06:** Organization approval metadata must not be treated as a universal login gate: current integration notes explicitly distinguish it from account-active/email-verification policy.

Sources: [AuthContext](../src/context/AuthContext.jsx), [Profile](../src/pages/account/Profile.jsx), [API helpers](../src/services/api.js).

### 6.2 Catalog and Human wizard

**HUM-01:** Fetch available industries and verification types through existing APIs. Store selected verification IDs; do not infer a check from a display name or batch title.

**HUM-02:** Show type names, available pricing and manual/automatic metadata as provided. Require at least one selected check before continuing.

**HUM-03:** Preserve the six-step Human structure: Industry → Verifications → Permissions → Template → Costing → Batch. Labels must explain that primary upload creation takes place on cost confirmation; the existence of a Batch step must not cause duplicate submission.

**HUM-04:** Open Search maps to the explicit open policy; Permission Required maps to the restricted policy. Frontend field requirements and backend payload must agree.

**HUM-05:** Costing displays selected check prices multiplied by record count and their total. Explicit agreement is required before creation. Cost approval is not a completed wallet payment.

**HUM-06:** If prerequisite draft/file state is absent, navigate back with actionable guidance rather than showing a broken costing screen.

**HUM-07:** Persisted wizard preferences may survive refresh; file objects and in-memory upload checkpoints must not be presented as recoverable after a full reload unless a persistent draft feature is implemented.

Sources: [Human step definitions](../src/data/humanVerificationFlow.js), [DownloadTemplate](../src/pages/org/DownloadTemplate.jsx), [CostBreakdown](../src/pages/org/CostBreakdown.jsx), [AppContext](../src/context/AppContext.jsx).

### 6.3 Excel/CSV intake

**XLS-01:** Generate/download the supported Human template with the selected fields/checks. Keep template conventions aligned with the backend rather than copying obsolete handoff fields.

**XLS-02:** Permission Required Human submissions require an Email column and a valid nonempty email for every populated row. Entirely blank rows are ignored.

**XLS-03:** Open Search Human submissions may omit the email column or leave email blank. A supplied email must still be well formed.

**XLS-04:** Validate rows before progressing and again before the final submission. Error messages identify affected spreadsheet row numbers.

**XLS-05:** Gender/Nationality remain row/template data in Excel. The removed Excel `bulk_gender`, `bulk_nationality` and OCR `assignments` fields must not be sent by this upload path.

**XLS-06:** Preserve upload progress, actual server-created/skipped outcomes and recoverable errors. An HTTP success must not be interpreted as proof that all rows were created.

Sources: [Conditional email implementation](human-required-email.md), [CreateBatch](../src/pages/org/CreateBatch.jsx), [Human email validation](../src/utils/humanEmail.js).

### 6.4 OCR intake, review and file attribution

**OCR-01:** Provide Single/Bulk selection, per-document rows, add/remove controls and optional photo/supporting-document inputs without requiring batch creation during extraction.

**OCR-02:** Place Gender, Nationality, Apply and template-download controls in the upload header alongside mode controls. Provide row selection and a Select All checkbox with a partial-selection state.

**OCR-03:** Apply demographic changes only to selected documents. Support workflows such as three users Male and four different users Female, followed by Nationality applied to all seven.

**OCR-04:** Resolve overlapping assignments independently per field; the later applicable group wins. Gender changes must not erase an independent Nationality assignment.

**OCR-05:** Track membership by stable local document IDs while editing. At submission, translate IDs to the exact final file order using zero-based indices; index zero is valid. Removing/reordering files must not transfer assignments to another person.

**OCR-06:** Review DL, Aadhaar, PAN and generic OCR layouts with Email included. Permission Required email checks apply to per-user confirmation, Confirm All, final preview and submission. Switching permission invalidates an incompatible email-free confirmation.

**OCR-07:** Send reviewed email before creation-time consent validation using the backend addendum contract:

```json
[
  { "file_indices": [0, 1], "gender": "Male" },
  { "file_indices": [0], "email": "person.one@example.test" },
  { "file_indices": [1], "email": "person.two@example.test" }
]
```

These entries travel as one JSON `assignments` multipart field with the ordered source files. Each email entry targets exactly one file. Never fill a missing subject email with the organization email or another person’s email. Open Search sends provided emails individually but permits blank emails.

**OCR-08:** Reject malformed assignments, invalid indices, invalid gender, literal “All” values and unsupported multi-value input before sending. Backend remains authoritative for full email/nationality validation.

**OCR-09:** Offer the documented gender values Male/Female/Other. The exact 195-entry nationality list remains unavailable in the handoff; current suggestions plus individual demonym entry must not be described as a complete synchronized catalog.

**OCR-10:** Show upload-confirmed values from `successful_users`; local preview values must not masquerade as persisted backend results.

**OCR-11:** Checkpoint successful batch creation before follow-up saves. Retry only incomplete photos/documents/review updates. Existing batch identity must remain authoritative when a follow-up fails.

**OCR-12:** Editing files/assignments from costing is available before creation. Once creation is checkpointed, recovery must not silently create another batch.

Sources: [OCR integration](ocr-gender-nationality-assignments.md), [Email addendum integration](human-required-email.md), [OCR assignments](../src/utils/ocrAssignments.js), [OCR submission](../src/utils/ocrSubmission.js).

### 6.5 Human consent

**CON-01:** Public consent pages require no account login and render loading, pending, accepted, rejected, expired, invalid/not-found and unavailable/error states.

**CON-02:** Display the backend-provided subject, organization, batch and deadline. Avoid exposing private reports through a consent token.

**CON-03:** A pending valid request offers Allow Verification and Reject. Disable duplicate submissions while a decision is in flight.

**CON-04:** Accepted/rejected decisions remain terminal after refresh. Expired/not-found requests have no actionable decision buttons.

**CON-05:** If a second window attempts a conflicting decision, refresh canonical server state and show its final outcome rather than remaining stuck.

**CON-06:** Pending, rejected and expired permission must block processing actions, including manual assignments, automatic retry and applicable certificate actions. Refresh eligibility before mutations; a stale enabled button cannot authorize processing.

**CON-07:** Acceptance may schedule automatic processing asynchronously. The public page must not call the Super Admin retry endpoint or claim that acceptance means a report is ready.

**CON-08:** Show consent badges only when valid Human consent data is available. Do not infer badges for Product/Warranty or fabricate fields absent from batch-list responses. An accepted decision is not revoked merely because its original response deadline is now past.

Sources: [Consent page](../src/pages/public/ConsentRequest.jsx), [Consent rules](../src/utils/consent.js), [Central consent guard](../src/services/consentGuard.js), [Integration notes](consent-notifications-integration.md).

### 6.6 Super Admin Batch Monitor and record details

**MON-01:** Display organization batches with actual batch identity, organization, counts, progress, status and Created On timestamp.

**MON-02:** Combine organization, batch type, verification type, search, status and creation-date filtering. Date filtering is explicitly batch creation date, not completion date.

**MON-03:** Support Today, last 7/30 calendar days, current month and custom/open-ended ranges. Include the entire local-calendar start/end days; reject reversed/invalid ranges.

**MON-04:** Match verification filters to actual IDs/names from metadata. Since list responses omit type details, bounded lazy detail loading may be required. Limit concurrent reads, cache successes and invalidate on refresh.

**MON-05:** Metadata failure must show Retry rather than presenting a misleading empty/partial result. Exports must use the same valid filtered dataset and be blocked while filter resolution fails or remains incomplete.

**MON-06:** Reset pagination on filter changes. Clear All restores filters. Summary cards currently describe all loaded batches and must not appear to be filtered totals without a deliberate scope change.

**MON-07:** The batch control center exposes record/check statuses, verifiers, report availability, overall state, certificate availability and authorized actions.

**MON-08:** Clicking the record identity area and the View action opens the same details. Show the Issues column when at least one record in the relevant table dataset has an issue; hide it otherwise.

**MON-09:** Record details show the correct person/product, checks, documents and versions, report links and certificate actions. Certificate downloads must use a confirmed certificate resource.

**MON-10:** Deleted batch pages show Batch No Longer Available and a return action. Do not leave a permanent skeleton or navigate to unrelated records.

Sources: [BatchMonitor](../src/pages/admin/BatchMonitor.jsx), [BatchControlCenter](../src/pages/admin/BatchControlCenter.jsx), [Filter notes](batch-monitor-filters.md).

### 6.7 Verifier assignment and email

**VER-01:** Maintain the verifier directory and supported verification-type associations using backend CRUD.

**VER-02:** Build manual assignments from pending checks, not only a person’s overall batch status. If two of three checks are completed, ordinary assignment email includes only the remaining eligible check.

**VER-03:** Exclude final approved/rejected/completed checks from ordinary sending. Rejected resubmission is a separate deliberate workflow, not a silent ordinary resend.

**VER-04:** Refresh consent and eligibility before send/resend operations. Unavailable eligibility must not be treated as permission granted.

**VER-05:** Allow allocation across verifiers without duplicate or missing user/check assignments in the intended send scope. Show assigned versus required counts and blocking feedback.

**VER-06:** Show Apply to all checks beside Edit Default Template only when a suitable single selected verifier is available. Reuse must respect supported check eligibility and the current send scope; it does not bypass consent or pending-check filters. Final allocations remain editable before send.

**VER-07:** Preserve default and per-verifier email-template editing, draft saving, server request identity and supported resend actions. Show server errors without claiming delivery.

Sources: [Pending-check rules](../src/utils/pendingManualVerifications.js), [API helpers](../src/services/api.js), [BatchControlCenter](../src/pages/admin/BatchControlCenter.jsx).

### 6.8 Public manual reports and decisions

**MAN-01:** Load only token-assigned records and show verification context, record serials, upload summary and request availability.

**MAN-02:** Support bulk serial-matched file staging and the existing per-row Upload File control. Display matched/unmatched results and allow corrections without adding duplicate upload controls.

**MAN-03:** Selecting files alone must not enable Submit Reports. At least one staged Approve/Reject decision is required, enforced both by button state and submit-handler validation.

**MAN-04:** Place Approve All within the table action area. It may stage decisions for locally matched candidates, but actual approvals must be filtered using server-confirmed upload/request data.

**MAN-05:** After upload, inspect successful file evidence (`files_uploaded` / `file_results`) and refetch `/verification/manual/request-info/{token}`. No approval is submitted if `used` is false or the upload has no successful matched files.

**MAN-06:** If any user has non-null `file_index`, only users with non-null `file_index` are approval eligible. Index `0` must pass. If all indices are null, all users may be eligible only when successful shared-report upload is confirmed.

**MAN-07:** Apply the same eligibility filter on every approval submission path, including single-row and bulk actions. Backend report attribution in mixed uploads must not be assumed to reject unsafe approvals independently.

**MAN-08:** Display submitted outcomes only after server confirmation. Staged “Approved (pending)” must remain visually distinct from a persisted approval. Rejections and required reasons follow the current endpoint’s rules.

Source: [DocumentUpload](../src/pages/public/DocumentUpload.jsx).

### 6.9 Automatic verification retry

**AUT-01:** Identify automatic checks from explicit backend check metadata, not document names alone. The DL example does not make every DL upload automatically retryable.

**AUT-02:** Super Admin retry is available only for eligible Human automatic records with missing reports and no final automatic decision. Manual-only, Product, Warranty and organization-role views do not expose this action.

**AUT-03:** Approved, verified, completed and rejected automatic decisions disable retry even when a report URL is absent. Any existing automatic report also disables it.

**AUT-04:** Because the endpoint retries a person, a completed/reported automatic sibling blocks the person-wide retry. A completed manual sibling does not by itself block an unfinished automatic check.

**AUT-05:** Freshly revalidate consent, identity, batch type and per-check status immediately before POST. Lock duplicate clicks and do not automatically repeat retry mutations.

**AUT-06:** Parse `batch_user_id`, `scheduled`, `already_in_progress` and message according to the supported contract. Scheduled/already-running responses mean waiting, not completed verification.

**AUT-07:** Observe existing authenticated user/batch data sequentially, currently every five seconds for at most 24 reads per observation window. Pause network reads while hidden, ignore stale results after closing/switching and show explicit timeout/error recovery.

**AUT-08:** Preserve full-batch and selected-user SDC behavior separately. The automatic-verification polling contract must not be reused as an assumed certificate-status contract.

Sources: [Retry integration](automatic-verification-retry.md), [Automatic rules](../src/utils/automaticVerification.js), [Automatic hook](../src/hooks/useAutomaticVerification.js).

### 6.10 SDC generation, issuance and certificate access

“SDC” is retained as the repository’s term; a formal business expansion is not specified here.

**SDC-01:** Support the existing backend generation, approval and issuance workflows. Generation, approval, issuance and sharing are distinct operations and states.

**SDC-02:** Build generation targets from eligible users and apply consent checks. Use configured organization Dhiway space/schema information where required.

**SDC-03:** Display approval requests, issuer responses, failure messages and confirmed certificate links. Never create a synthetic Ready state from a successful request submission alone.

**SDC-04:** Certificates can be listed and viewed through existing SDC record APIs. Download/view actions must resolve the intended record and preserve supported signed links.

**SDC-05:** Provide refresh and authorized generation/regeneration controls. Sharing with the organization must use the supported batch-sharing operation.

**SDC-06:** Selected-user generation must eventually stop observing when its requested users are complete, without requiring a manual page refresh, while preserving full-batch behavior. This remains a contract-validation item: historical backend batch-wide `done` semantics must be confirmed before changing client completion rules.

**SDC-07:** The routed SDC admin screen being hidden in the sidebar is an explicit navigation decision to resolve before release, not evidence that certificate functionality is absent.

Sources: [SDCVerification](../src/pages/admin/SDCVerification.jsx), [SDC API helpers](../src/services/api.js), [Certificate list](../src/pages/qr/ReportsList.jsx), [Certificate detail](../src/pages/qr/ReportView.jsx).

### 6.11 Product verification and warranty

**PRO-01:** Product verification follows Sector → Service → Verifications → Template → Costing → Batch. Warranty follows its separate five-step variant and skips verification-type selection.

**PRO-02:** Product verification templates include required product name and SKU metadata, with image handling aligned to the supported workbook contract. Embedded images must not be treated as typed URLs when the contract expects workbook image cells.

**PRO-03:** Use backend-authoritative templates when available. Keep product metadata separate from generated report/QR destinations; verifier output fields must not be invented as organization-entered Excel columns.

**PRO-04:** Warranty intake supports the existing serial-reservation, workbook and associated-document flow. Keep per-product documents linked to their actual product/serial identity.

**PRO-05:** Super Admin can review supported warranty status and submit approved/rejected decisions with required reasons. Organization views reflect confirmed server results.

**PRO-06:** Human email/consent restrictions, OCR demographic assignments and Human automatic-retry actions must not leak into Product/Warranty flows.

Sources: [Product flow definitions](../src/data/productVerificationFlow.js), [ProductTemplate](../src/pages/org/ProductTemplate.jsx), [ProductCostBreakdown](../src/pages/org/ProductCostBreakdown.jsx), [Warranty admin](../src/pages/admin/ProductWarrantyAdmin.jsx).

### 6.12 Individual skills

**SKL-01:** Individuals create and maintain their own skills/education/project entries and supporting evidence through the existing skills APIs.

**SKL-02:** Skill Tree and All Skills display real fetched entries, actual pending/verified/rejected states and supported edit/document/delete operations.

**SKL-03:** Super Admin can inspect submitted skills, update supported outcomes, request external verification and resend a known request.

**SKL-04:** Public skill-verifier upload is scoped to its token and records server-confirmed reports/decisions.

**SKL-05:** Individual Credentials and Share Profile are not complete production features while they use sample credentials, a hardcoded public URL or simulated PDF actions. Replacing them needs a real data/share/export contract before launch claims.

Sources: [SkillTree](../src/pages/individual/SkillTree.jsx), [SkillsManagement](../src/pages/admin/SkillsManagement.jsx), [Public skill upload](../src/pages/public/SkillVerifierUpload.jsx).

### 6.13 Organization and account administration

**ADM-01:** Super Admin can list/search users and organizations and open supported detail/edit actions.

**ADM-02:** Organization detail and edit use dedicated pages. Organization-specific metadata editing must not accidentally update unrelated account identity fields.

**ADM-03:** Keep deactivation, permanent deletion, organization approval and GST state operations distinct. Destructive operations require a clear target and explicit confirmation.

**ADM-04:** Expose authorized Super Admin creation/promotion only to eligible administrators and use backend enforcement for role changes.

**ADM-05:** Display organization service, industry, onboarding, account, registration/GST and Dhiway configuration using actual response fields. Do not infer one status from another.

Sources: [OrganizationList](../src/pages/admin/OrganizationList.jsx), [OrganizationDetail](../src/pages/admin/OrganizationDetail.jsx), [AllUsersList](../src/pages/admin/AllUsersList.jsx).

### 6.14 Email Drafts and batch recipients

**EML-01:** Preserve reusable email-template create/read/update/delete and send-history workflows. Template persistence is independent from batch-recipient lookup.

**EML-02:** Provide verification-type and batch-name selectors. Do not require an operator to type a raw UUID for normal selection.

**EML-03:** Fetch recipients for the selected verification type and required batch ID. Reload when either selection changes and ignore stale responses.

**EML-04:** Show returned user identity/contact/status/reason data and a clickable Report link only when `report_url` is present.

**EML-05:** Render clear initial, loading, empty and error states. A failed lookup must not show recipients from a previous batch/type.

**EML-06:** A saved draft is not a sent email; history and send acknowledgements must represent actual backend events.

Source: [EmailDrafts](../src/pages/admin/EmailDrafts.jsx).

### 6.15 Notifications and browser push

**NTF-01:** Organization bell and notification page use persisted backend notifications with unread counts, All/Unread filtering, pagination, mark-one and mark-all read.

**NTF-02:** Batch Deleted messages must not navigate into the deleted batch. Refreshing its former URL shows unavailable state.

**NTF-03:** Read state survives refresh, remains isolated to its authenticated organization and treats a valid zero-count mark-all result as success.

**NTF-04:** Browser push is an optional channel separate from in-app persistence. Show Enabled only after a real FCM token and acknowledged backend registration.

**NTF-05:** Request notification permission only from an explicit user action. Missing configuration, unsupported browsers and denied permission must not cause repeated prompts or block the application.

**NTF-06:** Scope tokens/listeners/late async responses to the current authenticated account. Handle rotation, opt-out and logout cleanup without cross-account registration.

**NTF-07:** Foreground push can trigger a toast and fetch real notification history; it must not fabricate a persistent row. Background clicks use trusted same-origin navigation.

**NTF-08:** Verify actual Firebase configuration, worker delivery, backend token migration/credentials and production HTTPS before declaring live push operational. Older integration notes describe configuration at the time of that work, not proof of today’s environment state.

Sources: [Notifications](../src/pages/account/Notifications.jsx), [Notification hook](../src/hooks/useOrganizationNotifications.js), [Push report](web-push-integration.md).

## 7. State and decision model

These are conceptual product states, not a proposal to rename backend enums.

| Domain | State | Allowed next action / meaning |
| --- | --- | --- |
| Intake | Local draft / extracting / reviewed | Edit locally, validate and approve cost; no created batch assumed |
| Intake | Creating | Lock duplicate submit; wait for actual creation response |
| Intake | Created, follow-up incomplete | Retry remaining saves against the same batch |
| Consent | Pending | Subject may decide; restricted processing blocked |
| Consent | Accepted | Eligible processing may start; reports may still be pending |
| Consent | Rejected / expired | No processing; no new decision buttons |
| Check | Pending / in progress | Observe or assign according to mode and eligibility |
| Check | Failed/error without final decision/report | Eligible automatic record may be retryable |
| Check | Approved/verified/completed/rejected | Final check outcome; automatic retry disabled |
| Certificate | Not generated / generating | No Ready claim or fabricated download |
| Certificate | Approval required / approved / issuing | Follow backend approval and issuance workflow |
| Certificate | Ready / shared | Confirmed resource available; sharing is separately recorded |
| Manual action | Staged approve/reject | Local intention only; no persisted result yet |
| Manual action | Submitted | Outcome confirmed by server |

One person can have completed and pending checks simultaneously. A batch’s aggregate state, an individual check’s state and a certificate’s state must never be used interchangeably.

## 8. Conceptual data model

| Entity | Relevant information | Relationships / constraints |
| --- | --- | --- |
| Account | ID, role/type, contact, active/verified status | Organization, individual or Super Admin identity |
| Organization | Name, service/industry, registration/GST, onboarding, Dhiway details | Owns batches; no cross-organization access |
| Batch | ID, name, entity type, organization, creation time, visibility, selected checks | Contains batch users/products; aggregate state derived from server |
| Batch user / product | ID, subject/product fields, serial, contact/custom fields | Stable server identity; not interchangeable with filename/local ID |
| Verification type | ID, name, category, industry association, mode, price | Per-record check metadata/status |
| Consent | Required flag, status, expiry/context | Human subject/request scoped; acceptance required before restricted processing |
| Document | ID, owner, label, version, resource/view reference | Source/photo/supporting report remains attributed to owner |
| Verifier | Identity/contact and supported types | Manual assignments/check scopes |
| Manual request | ID, token context, assigned users, upload/file mappings | Secure scoped external workflow |
| Email draft / send event | Template text/type; separate historical send metadata | Recipient lookup is batch/type scoped |
| Certificate / SDC record | Public/provider identity, resource links, issue/approval state | Linked to eligible records and configured organization space |
| Skill | Individual, category/content, evidence, status | Separate skills lifecycle and verification request |
| Notification / push token | Persisted message/read state; device registration metadata | Authenticated owner scoped |

Exact schemas, nullability and enum definitions remain owned by the backend. The frontend must not infer report ownership from an email/name match or fill unknown state with a success value.

## 9. API and integration requirements

The following are selected existing paths from `src/services/api.js`; placeholders describe actual IDs/tokens. This is an integration inventory, not a replacement OpenAPI contract.

| Capability | Existing API operations |
| --- | --- |
| Identity | `/auth/signup/organization`, `/auth/signup/individual`, `/auth/login`, `/auth/me`, OTP/reset and Google operations |
| Organization/admin | `/auth/users`, `/auth/organizations`, organization detail/update and Super Admin operations |
| Catalog | `GET /verification/industry-types`, `GET /verification/verification-types` |
| Human workbook | `POST /verification/generate-human-template`, `POST /verification/bulk-upload` |
| OCR preview/create | `POST /ocr/extract`, `POST /verification/bulk-upload/documents` |
| OCR follow-up | `POST /verification/upload/ocr-photo`, `PATCH /verification/batch-users/{id}`, `POST /verification/humans/upload-doc` |
| Batch/user reads | `GET /verification/batches`, `GET /verification/batches/{id}`, `GET /verification/user/{id}`, `GET /verification/all` |
| Consent | `GET /verification/consent/{token}`, `POST /verification/consent/{token}/decision` |
| Manual assignment | `POST /verification/manual/send-bulk`, `POST /verification/manual/smart-send`, resend endpoints, batch manual-assignment reads |
| Public manual reports | `GET /verification/manual/request-info/{token}`, `POST /verification/manual/upload/{token}`, `POST /verification/manual/verify/{token}` |
| Automatic retry | `POST /verification/batch-users/{id}/retry-automatic-verification` with no request body |
| Email recipients | `GET /verification/email-drafts/{encoded_verification_type}/recipients?batch_id={id}` |
| Templates/history | `/verification/email-drafts...`, `/email-drafts/admin/all`, `/email-drafts/history` as defined in the helper |
| Warranty | `/verification/products/warranty-template`, `/warranty-reserve-serials`, `/warranty-upload` under the products prefix; warranty status/decision/document operations |
| SDC | Batch generation/issuance, `GET /sdc/batches/{id}/status`, approvals, `/sdc/records` and record detail |
| Notifications | `GET /verification/notifications`, individual-read and read-all operations |
| Push | `GET/POST/DELETE /push/tokens` |
| Verifier directory | `/verifiers` CRUD |
| Skills | `/skills/add`, `/skills/me`, skill/document/status/request operations and token-upload workflow |

Required integration behavior:

- Use configured clients/base URLs; do not hardcode production credentials or raw tokens into UI, documentation or logs.
- URL-encode verification type path segments and query parameters through supported helpers.
- Preserve backend validation/error messages in readable form, including row/file attribution where returned.
- Distinguish authentication errors, unauthorized scope, invalid targets, conflicts, unavailable service and partial success.
- Never interpret HTTP 200 alone as full creation/upload/report/issuance success.
- Use cancellation/session identity guards so stale reads cannot overwrite a different selected record or account.
- Confirm current contracts before introducing new polling fields or query parameters.

## 10. Shared UX and accessibility

**UX-01:** Keep the existing visual system: clear page hierarchy, readable field labels, consistent status badges, Lucide icons and responsive layouts.

**UX-02:** Popups keep headers and footers visible while only the content body scrolls. Form actions remain accessible on small screens and at increased zoom.

**UX-03:** Use custom dropdown/listbox components for requested selection surfaces, with keyboard navigation, visible focus, accessible labels, correct selection state, Escape/outside dismissal and no clipped menus. A div alone is not an accessible dropdown implementation.

**UX-04:** Loading skeletons match the destination layout. Action spinners indicate ongoing mutations; an error or empty dataset must not remain an endless skeleton.

**UX-05:** Tables keep aligned headers/cells, compact useful spacing, clear clickable identity areas, consistent actions and explicit pagination. Hide irrelevant optional columns without misaligning rows.

**UX-06:** Disabled controls explain blocking conditions such as consent, incomplete allocation, missing decision, existing report or loading state.

**UX-07:** All actions support keyboard operation, meaningful labels and non-color-only state communication. Icon-only delete/close controls need accessible names.

**UX-08:** Support desktop and mobile widths, including a 390px test viewport. Horizontal scrolling is acceptable within a deliberate wide-table container, not accidental page overflow.

**UX-09:** Public token pages always render a meaningful loading/result/error state. Deep links must survive direct opening and refresh; a white screen is a release blocker.

## 11. Nonfunctional requirements

| Area | Required behavior / validation |
| --- | --- |
| Data integrity | Stable subject/document mapping, correct first-file index handling, no cross-user report/email fallback, no duplicate creation on follow-up retry. |
| Security | Backend role/tenant/token authorization; no secrets in client bundles/logs; public requests isolated from account authentication. |
| Privacy | Minimize identity/contact data exposure; restrict private report access; define retention and deletion policy before production sign-off. |
| Reliability | Bounded reads, duplicate-action locks, actionable errors, cancellation and safe partial-save recovery. |
| Performance | Avoid unbounded per-row fetch storms; retain three-concurrent batch metadata limit and cancel obsolete work. Establish measured page/batch budgets before scale commitments. |
| Accessibility | Keyboard and screen-reader checks, visible focus, labels, reduced-motion behavior and usable modal scrolling. WCAG 2.2 AA is a proposed target, not an audited certification. |
| Compatibility | Validate supported desktop/mobile browsers; push may degrade gracefully. Exact browser/version support matrix remains open. |
| Deployment | SPA deep-link fallback, correct asset MIME types, HTTPS, worker availability, Vite build-time public configuration and compatible backend contracts. |
| Observability | Proposed: privacy-safe error categories and request correlation for creation, consent, provider, email, report and issuance failures. Existing analytics coverage is not established. |

No numerical uptime or latency SLA has been approved. Bundle-size warnings are known; the application must be measured before setting production performance targets.

## 12. Proposed success metrics

These are measurement definitions, not current measured results or committed targets. Product/operations should establish baselines and target values.

| Metric | Definition |
| --- | --- |
| Intake completion rate | Successfully created eligible batches / started intake sessions, split by Excel and OCR |
| OCR correction effort | Median review time and corrected fields per OCR record |
| Consent response rate | Accepted or explicitly rejected delivered requests / delivered consent requests |
| Consent time to decision | Time between issued request and confirmed subject decision |
| Manual turnaround | Assignment-to-final-decision time, segmented by check/verifier |
| Automatic completion rate | Eligible scheduled automatic checks reaching a terminal result/report |
| Retry recovery rate | Retry attempts resulting in the requested report without duplicate processing |
| Certificate turnaround | Eligible verification completion to confirmed issuance |
| Data attribution defects | Incorrect owner/file/report/email associations detected per submitted record |
| Duplicate creation rate | Unintended duplicate batches caused by the same submission/recovery attempt |
| Notification reliability | Backend persisted event, channel delivery and user-read rates measured separately |
| User-visible failure rate | Sessions encountering blocking UI/API errors, categorized by stage |

Analytics must not record raw document contents, consent tokens, FCM tokens or complete sensitive payloads. Deduplication/correlation strategy and consent for analytics remain open design decisions.

## 13. Acceptance and manual QA matrix

Use disposable test organizations, controlled inboxes and non-production identity/provider data. Destructive tests use expendable records only. Capture sanitized URL/method/status/body evidence for failures.

| ID | Scenario | Acceptance result |
| --- | --- | --- |
| QA-01 | Organization and individual signup/login, OTP/reset and configured Google login | Correct role/session; applicable onboarding; no role elevation from local selection |
| QA-02 | Open an admin route as organization and a protected route while signed out | Access denied/redirected and backend data remains inaccessible |
| QA-03 | Change a batch/user/notification ID to another organization | No unauthorized data or mutation |
| QA-04 | Private Human workbook missing Email header | Blocked with an actionable header error |
| QA-05 | Private workbook with valid first user and blank/invalid later email | Blocked with correct spreadsheet row numbers |
| QA-06 | Open workbook with missing/blank email | Can proceed; malformed supplied email is rejected |
| QA-07 | OCR DL/Aadhaar/PAN/generic layouts in Permission Required mode | Email is visible and required in every layout |
| QA-08 | Seven OCR users: first three Male, other four Female, all Indian | Only intended rows change; final payload indices and values are correct |
| QA-09 | Reorder/delete OCR files after demographic selection | No assignment or email transfers to a different person |
| QA-10 | Two OCR IDs with no extracted emails, distinct reviewed emails | Creation multipart contains two singleton email assignments with the correct file indices |
| QA-11 | Open OCR with some blank and some supplied emails | Blank assignments omitted; supplied email targets only its own file |
| QA-12 | Switch Open to Permission Required after email-free confirmation | Final preview/submission blocks until every email is valid |
| QA-13 | Reject cost agreement or select no checks | No batch creation request |
| QA-14 | OCR creation succeeds; subsequent attachment/review update fails | Retry reuses batch and completed saves; no second creation request |
| QA-15 | Open valid pending consent link signed out/incognito | Correct context and Allow/Reject controls; no account auth required |
| QA-16 | Accept, reject, expire or corrupt separate consent tokens | Correct terminal/error states, no inappropriate decision buttons |
| QA-17 | Submit conflicting decisions in two windows | Second view shows canonical server outcome |
| QA-18 | Attempt manual send/retry/certificate action before accepted required consent | No unauthorized processing mutation |
| QA-19 | Accept consent for an eligible automatic record | Backend schedules work; authenticated views eventually reflect its real result |
| QA-20 | Person has three checks, two final and one pending | Ordinary verifier email includes only the remaining eligible check |
| QA-21 | Select one suitable verifier | Apply to all checks appears beside template edit and respects eligibility |
| QA-22 | Assignment scope has missing/duplicate allocations | Send is blocked with allocation feedback |
| QA-23 | Stage manual files without approving/rejecting | Submit Reports remains disabled and handler cannot submit |
| QA-24 | Stage a decision and upload matched/unmatched reports | Submit follows actual outcomes; unmatched rows do not become approved |
| QA-25 | Manual mixed upload with tagged index 0 and untagged users | Index 0 is eligible; untagged users are excluded from approval |
| QA-26 | Upload returns 200, zero matched files, `used: false` | No approval submission |
| QA-27 | Confirmed successful shared report; all indices null | Shared-report eligibility follows the confirmed contract |
| QA-28 | Automatic Human missing report versus manual/Product/Warranty record | Retry only exposed in the supported Super Admin automatic context |
| QA-29 | Automatic approved/rejected/reported sibling | Person-wide retry is disabled; completed manual sibling alone does not block |
| QA-30 | Double-click retry / already-in-progress response | One mutation; waiting state; no fabricated report completion |
| QA-31 | Automatic status timeout, hidden tab, changed/closed record | Bounded reads, no hidden requests or stale result overwrite; refresh available |
| QA-32 | Combine verification, org, status, type, search and date filters | Consistent table and export; inclusive calendar boundaries |
| QA-33 | Metadata fetch fails or date range is invalid | Explicit error/Retry; partial or invalid export blocked |
| QA-34 | Record table with zero issues, then one issue | Issues column hidden, then shown consistently |
| QA-35 | Click record identity and View | Both open the same correct details |
| QA-36 | Generate certificates for selected users and full batch separately | Completion follows requested scope; actual certificates display without forced refresh |
| QA-37 | SDC approval/issuance failure or pending state | No premature Ready; actual approval/error recovery shown |
| QA-38 | Product and warranty submission/review | Correct independent steps/templates/documents; no Human consent/retry leakage |
| QA-39 | Individual skill creation/document update and external verification | Correct owner, persisted evidence and confirmed status |
| QA-40 | Change Email Drafts batch/type rapidly | Only latest matching recipients appear; report links reflect returned users |
| QA-41 | Delete an expendable org batch as Super Admin | Org gets actual notification; click avoids deleted detail; old URL shows unavailable |
| QA-42 | Mark read/all, paginate, refresh, switch organization | Correct persisted counts and no cross-account messages |
| QA-43 | Push unconfigured/denied, then configured with explicit enable | No unsolicited prompt; real token acknowledgement required for Enabled |
| QA-44 | Push logout/account switch and background click | Bounded cleanup, no stale-account registration and trusted destination |
| QA-45 | Mobile/keyboard/modal/deep-link loading and errors | Usable fixed modal actions, accessible controls, no accidental page overflow or white screen |

Existing integration notes report 103 passing automated tests and a successful build after the OCR email addendum. Those are historical local results, not a fresh execution or live-backend verification for this PRD. The full matrix above is broader than that automated coverage.

## 14. Known gaps and risk register

| ID | Gap / risk | Impact | Required next step |
| --- | --- | --- | --- |
| GAP-01 | OCR per-file email backend addendum deployment and actual consent-mail delivery unverified | Private OCR records may still be skipped against an older backend or mail may not arrive | Confirm deployed contract; run controlled multi-user OCR consent E2E |
| GAP-02 | Consent scheduling/expiry worker deployment and provider execution unverified | Accepted requests may not produce reports; expiry may not progress | Confirm migrations, queues/scheduler and provider environment with backend/ops |
| GAP-03 | Canonical 195-entry nationality list unavailable | Search suggestions are incomplete; backend may reject other demonyms | Supply exact shared constant or an approved catalog endpoint |
| GAP-04 | Selected-user SDC status historically batch-wide | Polling may continue despite selected certificates existing | Verify current response contract and requested-scope acceptance before client changes |
| GAP-05 | Wallet, support-submit and activity screens use demo behavior | UI may imply transactions/tickets/audit evidence that do not exist | Integrate real contracts or clearly hide/label demonstration surfaces |
| GAP-06 | QR scan/result simulated; individual credentials/share partly hardcoded | Users may mistake sample output for verified identity/credentials | Complete real scan/lookup/share/export integration before production claims |
| GAP-07 | Uneven explicit route guards | Direct-navigation behavior may diverge from sidebar roles | Audit all routes and preserve backend authorization as authority |
| GAP-08 | Push production configuration and delivery not established by source inspection | In-app notifications may work while OS push does not | Validate actual env, workers, credentials, token API and focused/background tests |
| GAP-09 | Verification filtering requires detail reads per candidate batch | Latency/request volume grows with dataset | Measure; consider backend-supported filter/summary metadata as a separate contract change |
| GAP-10 | No durable upload draft or explicit creation idempotency contract established | Reload/ambiguous timeout can require recovery; memory checkpoints are insufficient across reload | Design backend idempotency and persistent draft recovery if required |
| GAP-11 | Retention, deletion audit, token lifetimes and regulatory policies not specified here | Unclear production privacy/operations obligations | Obtain approved business/security/legal policies; do not infer compliance |
| GAP-12 | Bundle-size warning, absent lint script and limited live E2E evidence | Performance and release confidence need measurement | Establish build/test/accessibility/E2E gates and performance budget |
| GAP-13 | SDC admin route hidden in sidebar | Feature discoverability differs from route availability | Decide supported navigation and operator access |

## 15. Proposed delivery priorities

This sequence is a planning recommendation, not an approved roadmap or estimate. Much of the core frontend already exists; implementation should address genuine gaps rather than rebuild integrated flows.

| Priority | Scope | Exit condition |
| --- | --- | --- |
| P0 — Integrity and consent | Backend compatibility, per-user emails, consent guards, report attribution, duplicate prevention, role/tenant enforcement | Controlled tests prove no restricted processing, cross-user attribution or duplicate creation |
| P0 — Usable results | Automatic recovery, selected-user/full-batch certificate completion and live report visibility | End-to-end results appear accurately without forced refresh |
| P1 — Operator efficiency | Allocation reuse, pending-check email scope, batch/date filters, recipients and report links | Accurate filtered actions/exports and reduced repeated entry |
| P1 — Production readiness | Notification/push delivery, accessibility, deep links, errors, deployment configuration and observability | Agreed acceptance matrix and operational handoff pass |
| P2 — Complete secondary surfaces | Real QR scanner/result, credentials/share, wallet/support/activity or removal of misleading demos | Each advertised surface has a confirmed real contract and persisted outcomes |
| Separate discovery | Marketplace, persistent drafts, payment monetization, large-scale filtering API | Approved business case and backend design before implementation |

## 16. Release gates and ownership

Before a production release covering these features:

1. **Product:** Approve scope, demonstration-feature treatment, SDC navigation and open business policies.
2. **Frontend:** Verify current source/build, route access, data mapping, responsive/accessible states and regression coverage.
3. **Backend:** Confirm exact deployed contracts, migrations, subject/tenant authorization, email assignment support and consent gates.
4. **Operations:** Confirm email sender/delivery, queue workers, expiry scheduler, automatic provider credentials/limits, SDC provider setup and push delivery configuration.
5. **QA:** Run the applicable acceptance matrix in an agreed test environment with controlled recipients and disposable records.
6. **Security/privacy:** Review public token scope/lifetimes, data retention, signed-resource access and logs against approved policies.
7. **Release owner:** Record known limitations, rollback procedure, environment versions and evidence of approval.

Named owners, launch criteria thresholds, support escalation contacts and deployment/rollback tooling remain to be assigned. No deployment, provider request, consent decision or outbound email was performed to create this PRD.

## 17. Open decisions

1. What production features should be publicly advertised versus hidden until integration is complete?
2. What is the formal business definition of SDC, and which generation/approval/issuance path is standard for each organization?
3. What is the authoritative current selected-user certificate completion contract?
4. How are failed creation requests with an unknown server outcome reconciled across page reloads?
5. What batch/file limits, supported formats, token lifetimes and retention rules are approved?
6. Who owns delivery failures and consent expiry/reissue policy?
7. What is the exact canonical nationality catalog and its update mechanism?
8. Which browsers, accessibility target, performance budget and service objectives are supported?
9. Is costing only an estimate/approval step, or will a real payment/ledger contract be introduced?
10. Which product analytics can be collected without exposing sensitive identity data?

## 18. Repository reference index

| Topic | Primary reference |
| --- | --- |
| Routing and roles | [App](../src/App.jsx), [AuthContext](../src/context/AuthContext.jsx), [Sidebar](../src/components/layout/Sidebar.jsx) |
| API contracts used by frontend | [API helpers](../src/services/api.js) |
| Human submission | [DownloadTemplate](../src/pages/org/DownloadTemplate.jsx), [CostBreakdown](../src/pages/org/CostBreakdown.jsx), [CreateBatch](../src/pages/org/CreateBatch.jsx) |
| OCR and conditional email | [OCR notes](ocr-gender-nationality-assignments.md), [Email notes](human-required-email.md), [Submission](../src/utils/ocrSubmission.js) |
| Consent and automatic work | [Consent notes](consent-notifications-integration.md), [Retry notes](automatic-verification-retry.md) |
| Admin batch controls | [BatchControlCenter](../src/pages/admin/BatchControlCenter.jsx), [Filter notes](batch-monitor-filters.md) |
| Public verifier reports | [DocumentUpload](../src/pages/public/DocumentUpload.jsx) |
| Product/warranty | [Flow definitions](../src/data/productVerificationFlow.js), [Warranty review](../src/pages/admin/ProductWarrantyAdmin.jsx) |
| Skills | [SkillTree](../src/pages/individual/SkillTree.jsx), [SkillsManagement](../src/pages/admin/SkillsManagement.jsx) |
| Certificates | [SDCVerification](../src/pages/admin/SDCVerification.jsx), [ReportsList](../src/pages/qr/ReportsList.jsx) |
| Email | [EmailDrafts](../src/pages/admin/EmailDrafts.jsx) |
| Notifications | [Push notes](web-push-integration.md), [Notifications](../src/pages/account/Notifications.jsx) |

For conflicts between old integration prose and current behavior, review the actual active code and latest agreed backend contract. Historical test totals and configuration observations must not be treated as current production evidence.
