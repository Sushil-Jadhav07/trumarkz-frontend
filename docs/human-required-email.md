# Conditional Human email validation

Permission Required (`private` / `permission_required`) requires a non-empty valid email for every Human user. Explicit Open Search (`public` / `open_search`) permits a missing email column or blank email. When an optional email is entered it must still be well formed.

The Human Excel/CSV wizard marks Email required in template setup only for Permission Required and validates every populated spreadsheet row, not merely the presence of its header. It repeats validation at final costing submission so changed permissions cannot bypass the rule. The existing direct Human bulk panel uses the same row validation. Empty spreadsheet rows are ignored and errors identify the affected sheet row numbers.

OCR review now shows Email in every document layout, including driving licence, Aadhaar, PAN and the generic form. Its required marker, email input type and validation follow the selected permission. Per-user confirmation, Confirm All, final preview and submission all check it. Switching from Open to Permission Required cannot reuse earlier email-free confirmations. The final OCR draft is checked before any creation, photo, attachment or review write; checkpoint behavior is preserved.

Reviewed emails are trimmed and retained in the existing review payload. Product/Warranty and the separate manual single-record form were not changed.

## OCR creation contract (2026-10-25 addendum)

The supplied backend addendum supersedes the earlier contract limitation: OCR creation now accepts `assignments[].email`, targeting exactly one file per entry. Final submission appends each non-empty reviewed email as `{ file_indices: [index], email }` in the same multipart request as its source image, before backend consent eligibility checks. Positions follow the final draft order, including index zero. Organization emails and another user's email are never used as fallbacks. Gender/nationality groups remain independent.

The API serializer preserves and validates individual email assignments, rejecting malformed addresses and entries targeting multiple files. Open Search still permits missing emails; provided emails are sent individually. Existing review PATCH, attachment handling and checkpoint retries remain in place. Live consent-email delivery and deployment of the updated backend still require end-to-end verification.

## Validation

101 automated tests passed. New checks cover required/open modes, all OCR field layouts, missing Excel headers, blank/invalid per-row emails, optional empty emails and a final OCR guard proving no writes occur for missing private emails. Browser checks with controlled APIs covered all four OCR layouts, incomplete and malformed private email, valid review saves, Open OCR without email, a permission switch after confirmation, private Excel missing header/blank cells and valid/open Excel progression. Production build passed. No real consent emails or batches were created in validation.

After the email-assignment addendum integration, 103 automated tests passed. Coverage includes the actual multipart API serializer retaining distinct per-file emails, final draft reordering, index zero, mixed demographic/email assignments, optional Open Search email, invalid/multi-file email rejection and review retries reusing the original batch. Production build passed. These are controlled API tests, not live mail-delivery tests.
