# Certificate-access direct identity checks

Date: 30 October 2026. Implemented locally; no merge, migration or deployment performed.

Source of truth: the complete supplied “§9 — Direct access for the organization and the certificate holder” backend addendum. This extends the existing visitor page; third-party approval and the holder approval-email page retain their APIs.

## Entry and server-selected branching

The existing `/certificate-access/request` route still accepts `document_id` or the manual report's `request_id` + zero-based `file_index`. Email request creation and OTP verification remain mandatory.

After `POST /verification/certificate-access/requests/{access_request_id}/verify`, route on the response's **`next_step`**, not the entered email, logged-in role or `identity_type` alone:

| `next_step` | Consistent `identity_type` | Extra form | Successful grant |
| --- | --- | --- | --- |
| `organization_password` | `organization` | Organization account password | `scope: report`; scanned report only |
| `holder_credentials` | `holder` | Registered mobile and DOB | `scope: holder`; holder's own reports |
| `holder_approval` | `third_party` | Existing waiting/holder-approval workflow | Existing holder-scoped visitor grant |

The frontend validates the documented step/identity pair. Unknown, incomplete or contradictory routing responses cannot become approved access. New direct-auth OTP responses must still be `pending_approval`; OTP alone never opens the report.

Older deployed backends returning neither additive field keep their original third-party approval flow. No direct identity is guessed locally. When the backend classifies an organization/holder-overlap email, or another unrelated registered email, as `third_party`, the frontend follows `holder_approval`.

## New API helpers

All requests use the dedicated public certificate-access client, without an unrelated account Authorization header.

### Organization

```text
POST /verification/certificate-access/requests/{access_request_id}/organization-auth
X-Certificate-Access-Token: <token returned by OTP verification>
```

Body: `{ "password": "<user-entered password>" }`.

### Holder

```text
POST /verification/certificate-access/requests/{access_request_id}/holder-auth
X-Certificate-Access-Token: <same token returned by OTP verification>
```

Body: `{ "dob": "YYYY-MM-DD", "phone_number": "<user-entered mobile>" }`.

Both mobile and DOB are required for this direct-holder form. This is separate from the existing approval-email form's conditional phone requirement. Phone formatting remains accepted; last-ten-digit matching is performed by the backend.

Success requires matching `request_id`, `status: approved`, the expected `scope` and a parseable `expires_at`. The direct-auth response does not replace the OTP token. A mismatched scope or malformed response produces an error, never an assumed approval.

## Security and recovery

- The report's manual request ID remains in its report reference. Credential-auth endpoints use the distinct visitor access-request ID.
- Password, DOB and mobile exist only in form state and the intended POST body; they are not written to sessionStorage, localStorage, URLs or logs. Password is cleared after each completed attempt; holder credentials are cleared after success. Forms initialize empty on reload.
- Only request identity, reference, visitor email, scoped token and `nextStep` are retained in the existing tab session so an unfinished request can resume its correct path.
- Resume reads the canonical status before displaying access. Direct paths do not run holder-approval polling while waiting for credentials. Manual status checking remains available.
- Third-party pending requests keep the existing bounded visible-tab polling; terminal and failed states stop observation.
- HTTP 403 displays the backend's generic mismatch message and allows retry. It does not reveal stored values, identify the mismatched field or invent a Google/password recovery bypass.
- HTTP 404 clears the stored request and offers Start a new request, covering legacy organization grants with no stored report reference.
- HTTP 422, 429 and 503 remain visible errors; Retry-After is shown when readable through CORS. No automatic credential POST retry occurs.
- Duplicate clicks are locked. Late responses after reference changes/unmount are ignored.
- Successful grants use the existing View report button and configured API reconstruction, with the **original** scoped token in `X-Certificate-Access-Token`. No token is added to a permanent URL and no arbitrary query URL is fetched.
- Report-only/holder-only scope, expiry, revocation and cross-holder denial remain backend-enforced on every report read. The frontend does not enumerate other reports or implement a client-side scope bypass.

## Validation results

- **162 automated tests passed**, including next-step/identity validation, legacy fallback, OTP-only direct-access rejection, exact success scopes and actual API payload/header contracts.
- **Production build passed**, with the existing bundle-size and Browserslist warnings.
- Isolated browser tests ran the real production build with controlled responses at 320px and 1440px. Covered organization OTP/password, holder OTP/mobile/DOB, no pre-auth report fetch, original scoped token on both auth and report reads, reload before credentials, generic wrong-details retry, 404 restart, 429/503, malformed scope rejection, double-click prevention and unchanged third-party routing.
- The same typed email was tested with a server-selected third-party response to prove email-based local identity inference is absent. Unknown routing fields were rejected; legacy responses without additive fields retained approval waiting.
- The browser test used no real password, OTP email, holder decision, credential authentication or private report. Scope enforcement on the actual backend still needs end-to-end verification.

## Deployment and manual QA

The addendum states backend changes are **local, uncommitted and undeployed**. Apply the backend migration **`sql/add_certificate_access_direct_auth.sql`** in the intended backend environment before deploying the compatible API and frontend. This frontend workspace does not contain/apply that backend migration.

Using a disposable Permission Required Human report and controlled inboxes:

1. Organization email → OTP → password form → wrong password stays denied → correct password → View report. Confirm this grant cannot fetch a different report.
2. Holder email → OTP → mobile/DOB form → wrong details stay denied → correct details → View report. Confirm another holder's report is denied.
3. Unrelated visitor email → OTP → waiting for holder → approval email workflow → View report after approval.
4. An email shared by organization and holder must take the backend's third-party path, as must an account registered to an unrelated organization.
5. Test a Google-only/inactive/unverified organization account, revoked/expired token, rate limiting and a predeployment request returning 404. Do not disclose which private credential failed.
6. Recheck Open Human, Product and Warranty, and existing authenticated organization/Super Admin report access.

No production behavior is claimed until the backend migration/deployment and real environment tests pass. Previously issued QR links pointing at the backend remain a separate legacy-navigation issue.
