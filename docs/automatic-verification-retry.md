# Consent-triggered automatic verification and Super Admin retry

The configured backend's public OpenAPI was inspected before implementation. The existing flow remains authoritative: accepting consent schedules backend work, and the frontend never submits an automatic retry from the public consent page.

## Contracts used

- `POST /verification/batch-users/{batch_user_id}/retry-automatic-verification`: authenticated Super Admin operation, no request body. The response contains `batch_user_id`, boolean `scheduled`, boolean `already_in_progress` (default false), and `message`. A scheduled or already-running response only starts status observation; it never marks a report complete. The existing consent guard refreshes the user and batch policy before this POST. The backend independently checks authorization, Human/automatic eligibility, consent and the worker lock.
- `GET /verification/user/{user_id}`: existing authenticated `BatchUserDetail` supplies the actual consent state and documents. It does not promise per-check report fields.
- `GET /verification/batches/{batch_id}`: existing batch detail supplies `batch_type` and the same `users[].verification_type_status` check labels, statuses and `report_url` already rendered throughout this frontend. User identity must match exactly across both responses. No new lock, progress or completion field was assumed.
- Public consent GET/decision responses do not expose reports or an authorized report-status endpoint. The public page explains that checks run in the background; private report polling stays in authenticated views. No account credentials or private reports are exposed through a consent token.

## UI and polling

Super Admin record/check details show **Retry Automatic Verification** for Human records with a check explicitly labeled `automatic`. It is active only after fresh data confirms consent eligibility, a missing automatic report and no final automatic decision. Approved, verified, completed and rejected decisions disable retry even if their report URL is absent. Any existing automatic report also disables retry, including a failed check carrying a report. Pending/failed/error checks with no report remain retryable. Manual-only, organization-role, Product and Warranty views do not expose the action. Consent-ineligible Human records show it disabled.

The endpoint retries a person rather than a named verification check. To avoid rerunning completed automatic checks, a final decision or generated report for any automatic sibling disables the person-wide retry. Completed manual checks do not prevent retrying an unfinished automatic check. Immediately before POST, the centralized action reads current consent and batch check statuses again; a stale enabled UI cannot submit after an automatic decision/report arrives.

Organization details receive status updates without the retry action. Human batch tables refresh pending automatic reports, including while consent is pending and after its acceptance in another window. Existing certificate polling and manual verification behavior were not replaced.

Reads run sequentially every five seconds for at most 24 reads, pause network requests while hidden, stop when reports are available or a read fails, and ignore late results after closing/changing records. Returning focus opens a fresh observation window; record details also provide an explicit status refresh after timeout/error. No polling loop sends a retry POST. Double clicks are locked immediately; scheduled/already-running responses disable further retries during observation. Errors such as 401/403/404/422 surface without assuming success or automatically resubmitting.

## Environment and verification

The user's six `VITE_` entries from ignored `src/.env` were synchronized into ignored root `.env`, which the existing Vite configuration loads. No environment values were logged or committed. Restart the dev server after environment changes. This retry feature requires no new environment variable. Firebase web push still has its own separately documented configuration requirements.

- Automated coverage includes retry eligibility, actual centralized API URL/body, pending-consent and late final-decision/report blocking, real rendered button visibility/disabled states, scheduled/already-in-progress response parsing, sequential polling, completion, bounded timeout, API errors, cancellation and hidden tabs.
- Isolated browser with mocked APIs: accepted, already in progress, failed automatic check, public Human, pending/rejected consent, manual-only, Product, ready report, organization role, 403/404/422 errors, one POST despite double click, and automatic report rendering. Mobile width 390px checked for overflow.
- Production build passed. Existing bundle-size/Browserslist warnings remain.

No real verification provider run, consent decision, email or retry POST was submitted during validation. Public OpenAPI confirms the deployed schema, not successful provider processing or database lock behavior. Those require a controlled end-to-end test in the intended environment.
