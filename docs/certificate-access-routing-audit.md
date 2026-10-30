# Permission Required certificate/report access audit

Date: 30 October 2026

## Finding

The reported screen shows a visitor navigating directly to a protected backend report endpoint and receiving its holder-approval error as JSON. The access restriction is expected. The missing visitor entry step is a link-generation/navigation integration problem, primarily on the backend-generated certificate/QR/report destination for this reported path.

A frontend cannot intercept an ordinary external QR navigation to a different origin. Rendering an access page on the frontend alone cannot change an already-issued QR/PDF link that points at the API.

The visitor page is **already implemented** in this repository. It must be reused rather than rebuilt. Read-only production checks also found its route and API/header markers in the deployed frontend bundle. This establishes code presence, not successful OTP/approval/report delivery.

## Evidence inspected

- The complete pasted backend investigation brief and supplied screenshot.
- `src/App.jsx`: public visitor and holder routes.
- `src/pages/public/CertificateAccessRequest.jsx`: reference input, email/OTP, approval status and report viewer.
- `src/pages/public/CertificateAccessApprove.jsx`: holder decision flow.
- `src/utils/certificateAccess.js` and `src/utils/reportAccess.js`: status vocabulary, report references, scoped headers and blob handling.
- `src/services/api.js`: separate public Axios client, visitor/holder endpoints and authenticated report-opening helpers.
- `src/components/shared/CertificateAccessPanel.jsx` and `ViewReportButton.jsx`: management controls and account report access.
- `src/context/AppContext.jsx`: excludes public access pages from account-scoped push/notification work.
- The configured backend's public `/openapi.json`, read without authentication or mutation.
- Public frontend HTML and its referenced application bundle, read without an actual report reference or visitor token.

No separate new handoff attachment was supplied in this turn. The pasted brief says the updated route/contract will follow; this audit compares the existing contract and does not assume that future change.

## Existing visitor entry contract

The active frontend route is:

```text
/certificate-access/request
```

Existing supported query references:

```text
/certificate-access/request?request_id=<MANUAL_REPORT_REQUEST_ID>&file_index=0
/certificate-access/request?document_id=<STORED_DOCUMENT_ID>
/certificate-access/request?report=<URL_ENCODED_REPORT_VIEW_URL>
```

The manual report request ID identifies the uploaded report. It is different from the new visitor access-request ID returned by the request-access endpoint. File index zero is valid.

Prefer the explicit report-reference parameters for generated links. Do not include the visitor scoped `access_token` in the generated link. The page also accepts a pasted existing report URL and reconstructs the content endpoint against its configured backend.

The holder decision route already exists separately:

```text
/certificate-access/approve/:token
```

The holder's approval-link token is a separate credential from the visitor's report-access token. They must not be substituted for each other.

## Requested checks

| Check from brief | Current frontend evidence | Result / limitation |
| --- | --- | --- |
| Visitor-facing entry page | Public `/certificate-access/request` route | Already exists; route/bundle found in deployed frontend |
| Receive report reference | Document ID, manual request ID + index, or report URL query | Existing formats above; confirm backend uses one of them |
| Email and OTP | Public request POST followed by verify POST and OTP UI | Implemented; real delivery not exercised |
| Pending holder approval | Waiting screen after verified response | Implemented |
| Check status | Check again control plus visible-tab interval | Implemented; interval currently continues in terminal states too |
| Retrieve approved report | Approved screen exposes View report; fetch uses scoped header and object URL | Implemented; server remains the authority on every fetch |
| Pending/rejected/expired/approved | Status-specific views, plus revoked/not-found | Implemented; unknown state currently falls back to waiting |
| Avoid opening protected content before approval | Visitor page fetches content only through approved-view action | Implemented on this page; external backend QR navigation bypasses it entirely |
| Avoid permanent token URLs | Visitor token stored in tab sessionStorage and sent in a header | No visitor-token URL generation found in this flow; sessionStorage is script-readable and is not a permanent URL |
| Preserve Open/Product/Warranty | Existing separate public/access-mode handling | No behavior changed during audit; full live regression not claimed |

## Existing API contract confirmed in public OpenAPI

1. `POST /verification/certificate-access/requests`
   - Body: `visitor_email` plus either `document_id` or `request_id` + `file_index`.
   - Response: HTTP 202 with `request_id` and `message`.
   - Documented generic response deliberately avoids revealing whether the report exists/is protected.
2. `POST /verification/certificate-access/requests/{request_id}/verify`
   - Body: `otp_code`.
   - Response: `request_id`, `access_token`, `status`.
3. `GET /verification/certificate-access/requests/{request_id}/status`
   - Header: `X-Certificate-Access-Token`.
   - Response: `request_id`, `status`.
4. `GET/POST /verification/certificate-access/approvals/{token}`
   - Holder GET supplies visitor/context/deadline and whether phone is required.
   - Decision body contains `decision`, `dob`, and applicable `phone_number`.
5. Existing protected report content routes accept the scoped header:
   - `/verification/manual/reports/{request_id}/view/{file_index}`
   - `/verification/documents/{document_id}/view`

The inspected manual-view schema explicitly prefers the `X-Certificate-Access-Token` header over its optional token query parameter. Current frontend visitor fetches use the header.

OpenAPI presence confirms the deployed schema, not email delivery, approval authorization, report rendering or live redirect behavior for a particular certificate. No actual report identifier was available as text for a safe targeted reproduction; no private report was requested.

## Responsibility split and backend handoff

**Backend / certificate generator:** For protected Human visitor destinations, generate the frontend entry URL with a non-token report reference rather than the protected content endpoint. Configure the intended frontend origin explicitly. Do not weaken the content endpoint's approval check.

**Previously issued certificates:** Updating future QR/PDF links does not repair old embedded API links. Decide how legacy browser navigations enter the access page: for example a browser-navigation-specific backend redirect/interstitial that preserves the reference. Do not redirect authorized scoped-token content fetches into an HTML page; the report viewer expects a binary response. Confirm how API clients and denied JSON requests remain supported.

**Frontend:** Reuse the current visitor and holder routes and public API client. Compare the backend's forthcoming exact route/parameters/schema with those above before integration changes. A follow-up now routes recognized holder-approval denials from frontend report actions to the existing visitor page; details and tests are below. Authentication failures and unrelated errors remain separate.

**Deployment:** The public entry returned HTTP 200 with the SPA shell on the inspected frontend domain, and its served bundle contains visitor/holder route markers, request endpoints and the scoped header. An isolated marker check is not a rendered-browser or end-to-end certificate test.

## Additional frontend follow-ups found

These are separate from the screenshot's primary routing cause. No runtime changes were made because the user requested diagnosis and the backend is still investigating the updated contract.

- Query-only reference changes do not fully reset the component's initialized request/token/report state. Explicit reference validation and cancellation/reset would make switching reports within the same mounted route more robust.
- `file_index` query parsing uses numeric coercion; blank/whitespace input can become zero. Validate the textual index strictly and reject ambiguous/conflicting references.
- Report reference decoding can throw on malformed percent encoding. Handle invalid input without a blank page.
- Status checks run every minute in all status-stage states, including approved/rejected/expired. Restrict observation to appropriate states, avoid overlapping manual/interval reads and respect rate-limit responses.
- Creation/verification/status payloads are consumed without full request-ID/token/status validation. Malformed responses should remain an explicit unavailable state rather than optimistic pending status.
- OTP validity, holder response period and access duration are hardcoded in page copy. Reconfirm the 10-minute / 24-hour / 72-hour policies against the final contract; public schema does not fully specify those constants.

None of these observations justifies removing OTP, holder approval, grant scope or backend authorization.

## Verification performed

- `node --test src/utils/reportAccess.test.js src/utils/certificateAccess.test.js`: **15 passed, 0 failed**.
- Checked existing parsing, file index zero, header selection, no credential attachment to unrelated hosts/routes, denial/error handling and grant state helpers.
- Read-only public backend schema and frontend shell/bundle checks succeeded.
- No source/runtime/security behavior changed. No build required for this documentation-only audit.
- No email, OTP request, approval decision, private-report read, provider operation or certificate regeneration was submitted.

## Joint end-to-end acceptance after contract agreement

Use a test Permission Required Human certificate and controlled visitor/holder inboxes:

1. Scan a newly generated QR on a signed-out device. It enters the frontend with the correct reference and no access token in the URL.
2. Request access and verify the visitor OTP. Pending approval must not expose report bytes.
3. Approve with the holder workflow; check status; fetch the intended report with the scoped header and preview/download its blob.
4. Repeat for reject, expiry, revocation, wrong OTP, missing/malformed reference and rate limiting.
5. Attempt another holder's report with the same visitor grant; the backend must deny it.
6. Verify an old issued QR according to the agreed legacy-navigation solution.
7. Verify owning-organization/Super Admin authenticated access, Open Human, Product and Warranty behavior independently.

The screenshot's denial should not be “fixed” by making the report public. The correct outcome is a visitor entry path leading to authorized, scoped report access.

## Follow-up: frontend rendering fixes

Following the request to fix the page display, the frontend now handles malformed percent-encoded report references without throwing during render. Blank, conflicting, duplicate or unsafe file-index query parameters show an actionable invalid-link message instead of selecting another file or resuming a different stored request. Query-only navigation remounts the visitor flow so a previous report/token is not displayed for a newly selected reference.

The shared OTP input now fits the available card width, including a 320px viewport, and labels each code digit for assistive technology. The public header can wrap its badge on narrow screens. These changes do not alter OTP or holder authorization, public access mode or backend token checks.

The production build passed. An isolated browser tested the real built application at desktop and 320px mobile widths with controlled API responses: email → OTP → pending → approved, no report fetch before approval, scoped-token header on report fetch, blob preview, no scoped token in the page URL, reference switching, invalid query recovery and malformed pasted links without runtime exceptions. No live email, OTP, holder decision or private report was used. These changes are local; no deployment was performed. The backend-generated/legacy external QR routing issue described above remains separate and pending.

## Follow-up: frontend approval-required navigation

Frontend report buttons now route a recognized HTTP 403 holder-approval response to `/certificate-access/request`, using only the document ID or manual request ID/file index. Query credentials and fragments from the content URL are discarded. The existing new tab is reused; if popup creation was blocked, the current tab opens the visitor page. The content endpoint remains protected and email/OTP/holder authorization is unchanged.

Successful report blob handling and external public Product/Warranty links keep their existing behavior. HTTP 401, missing reports, service errors and unrelated HTTP 403 responses do not silently become approval requests. This change cannot intercept a QR that navigates directly to the backend origin: legacy backend navigation/QR generation still needs its own fix.

21 targeted tests passed, including actual exported API report-opening behavior under controlled responses: denial routing, index zero, stripping source token/fragment data, popup-blocked recovery, successful/public behavior and unrelated error handling. The earlier full regression run passed 153 tests before these four additional navigation tests. No deployment or live OTP/report test was performed.

## Latest backend handoff alignment

The subsequently supplied backend QR formats match the existing visitor query formats. Additional response validation, failed-state recovery, bounded pending-only polling and holder decision confirmation are now implemented. See [the current integration handoff](certificate-access-integration.md) for routes, exact API usage, 160-test regression results, browser scenarios and remaining live/legacy-QR deployment checks. The earlier gap list above records findings at the original audit point.
