# Permission Required Human certificate access — frontend handoff

Updated: 30 October 2026. Status: implemented locally, not merged or deployed.

## Routes and QR compatibility

Both public pages already existed and were reused. The new backend QR formats match the active routes in `src/App.jsx`:

| Case | Frontend entry |
| --- | --- |
| Manual report | `/certificate-access/request?request_id={manual_report_request_id}&file_index={index}` |
| Automatic/stored report | `/certificate-access/request?document_id={document_id}` |
| Holder approval email | `/certificate-access/approve/{approval_token}` |

No account login is required. Conflicting, incomplete and duplicate reference parameters are rejected. File index zero is valid. Changing the reference/token resets the mounted flow and late results cannot update the new selection.

## Visitor APIs and identity separation

1. `POST /verification/certificate-access/requests`
   - Body: `{ visitor_email, document_id }` **or** `{ visitor_email, request_id, file_index }`.
   - Save the returned visitor access-request `request_id` separately from the manual report's `reference.request_id`.
2. `POST /verification/certificate-access/requests/{visitor_request_id}/verify`
   - Body: `{ otp_code }`.
   - Validate returned request identity, known status and nonempty `access_token`; do not infer verification success from HTTP 200 alone.
3. `GET /verification/certificate-access/requests/{visitor_request_id}/status`
   - Header: `X-Certificate-Access-Token`.
   - Validate returned request identity/status. Pending, approved, rejected, revoked, expired, failed and unavailable responses have distinct handling.
4. After approval, reconstruct the report content URL from the reference and configured `VITE_VERIFICATION_API_URL`, falling back to `VITE_API_BASE_URL`:
   - `/verification/manual/reports/{manual_report_request_id}/view/{file_index}`
   - `/verification/documents/{document_id}/view`
   - Fetch the binary with `X-Certificate-Access-Token`; display a PDF/image blob or provide its download.

The legacy pasted-link/query form extracts only a report identity. It never fetches the supplied origin or its query/fragment. An arbitrary external URL cannot become the visitor's report-fetch target.

## Holder APIs

- `GET /verification/certificate-access/approvals/{approval_token}` loads the supported visitor email, issuing organization, request timestamp, approval deadline and `requires_phone_number` flag.
- `POST /verification/certificate-access/approvals/{approval_token}` submits `{ decision: 'approve' | 'reject', dob, phone_number? }`.
- DOB is required for both decisions; phone is required only when indicated. Duplicate submission is locked.
- A valid matching server status is required before displaying success. Malformed responses cannot produce assumed approval/rejection.
- Expired/used links, validation failures, rate limiting and service errors show recoverable messages.

The inspected existing `ApprovalInfo` schema does not supply a holder name, individual report title or document list. The page therefore shows available request/organization/deadline context and explains that the scope is the holder's certificate reports. It does not fabricate identity/report metadata. If richer context is required, the backend must document the additional response fields.

## Polling and security

- Pending requests check once per minute while visible, with no overlapping reads or mutations.
- Automatic observation stops on terminal/error states or after 30 status reads. Manual Check again remains available. This limit is frontend observation behavior, not an invented backend expiry.
- Resume validates current server state before showing approved access. A denied report fetch returns to a failed/recheck screen; it does not bypass the backend.
- Visitor tokens stay in component/tab session state, never in generated page/report URLs, account auth storage or logs.
- Public APIs use a dedicated client without an unrelated organization/Super Admin Authorization header.
- Holder approval tokens remain distinct from visitor scoped tokens.
- The existing authenticated report-button fallback sends recognized holder-approval denials to the visitor entry without copying source token queries/fragments.
- No protected endpoint was made public; no OTP, holder DOB/phone or scoped-token check was removed.
- Open Human, Product and Warranty behavior is preserved. Unrelated authentication/verification code was not changed by this handoff implementation.
- Hardcoded OTP/approval/access duration promises were removed from these pages; backend deadlines/policy remain authoritative.

## Validation

- **160 automated tests passed**, including public API payload/header contracts, manual-versus-visitor request IDs, malformed responses, status handling, report routing, index zero, token URL stripping and existing regressions.
- **Production build passed**; existing large-bundle/Browserslist warnings remain.
- Isolated browser tests used the real built application and controlled API responses. Covered manual index zero and automatic document references, email/OTP, pending/approved/rejected/expired/failed states, malformed verification response, rate-limited status, 30-read polling cap, terminal-state stop, holder DOB/conditional phone, approve/reject and malformed holder responses without false success.
- Browser checks also verified no report fetch before approval, the scoped report header, report blobs, reconstruction against the configured API instead of an arbitrary query host, no scoped token in URLs and 320px/1440px layout.
- CORS must expose `Retry-After` for precise rate-limit countdown copy; otherwise the UI gives generic retry guidance and stops automatic reads.
- Browser writes were mocked. No real email/OTP, holder decision, private-report access, backend deployment or provider operation was performed.

## Before merge/deployment

1. Deploy the compatible backend and frontend together and confirm the backend's frontend origin configuration.
2. Generate a new test Manual and Automatic Permission Required Human certificate. Scan each QR signed out and confirm the correct frontend reference.
3. Complete real visitor inbox OTP → holder DOB/phone decision → status → intended protected report using controlled test accounts/data.
4. Check rejection, expiry, revocation, wrong OTP, rate limiting and cross-holder denial; retest Open Human, Product and Warranty.
5. Decide legacy behavior separately: new certificate URLs do not alter old QR/PDF links that still navigate directly to a backend report endpoint. Those need the backend legacy-navigation solution or certificate regeneration.

The implementation is ready for joint environment testing; successful mocked tests are not proof of live delivery or legacy QR repair.
