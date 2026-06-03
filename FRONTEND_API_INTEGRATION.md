# TruMarkZ — Frontend API Integration Guide

> Version 1.0 · June 2025  
> Base URL: configured via `VITE_API_BASE_URL` (auth) and `VITE_VERIFICATION_API_URL` (verification)

---

## Table of Contents

1. [Setup & Configuration](#1-setup--configuration)
2. [Authentication](#2-authentication)
3. [Verification](#3-verification)
4. [Excel Template Generation](#4-excel-template-generation)
5. [Credential Templates](#5-credential-templates)
6. [Admin & Super Admin](#6-admin--super-admin)
7. [Integration Flows](#7-integration-flows)
8. [Error Handling](#8-error-handling)
9. [Endpoint Quick Reference](#9-endpoint-quick-reference)

---

## 1. Setup & Configuration

### Environment Variables

```env
VITE_API_BASE_URL=https://trumarkz-api-54038467488.asia-south1.run.app
VITE_VERIFICATION_API_URL=https://trumarkz-api-54038467488.asia-south1.run.app
```

### Two Axios Instances

```js
// api.js — Auth & Admin API
const api = axios.create({ baseURL: VITE_API_BASE_URL, timeout: 30000 });

// Verification API (longer timeout for file uploads)
const verificationApi = axios.create({ baseURL: VITE_VERIFICATION_API_URL, timeout: 60000 });
```

### Authorization Header

Every protected request must include:

```
Authorization: Bearer <access_token>
```

The token is automatically injected by the Axios request interceptor using the JWT stored in `localStorage`.

### Public Endpoints (No Token Required)

These endpoints skip the Authorization header automatically:

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Login |
| `POST /auth/signup/organization` | Register org |
| `POST /auth/signup/individual` | Register individual |
| `POST /auth/verify-otp` | Verify email OTP |
| `POST /auth/resend-otp` | Resend OTP |
| `POST /auth/forgot-password` | Send reset OTP |
| `POST /auth/reset-password` | Reset password |
| `GET /auth/google/url` | Get Google OAuth URL |
| `POST /auth/google` | Google OAuth (mobile) |
| `GET /verification/categories` | Product categories |
| `POST /verification/upload/document` | Upload document (invite link) |
| `POST /verification/upload/photo` | Upload photo (invite link) |

---

## 2. Authentication

### 2.1 Sign Up — Organization

```
POST /auth/signup/organization
Content-Type: application/json
```

**Request Body**
```json
{
  "org_name": "Acme Corp",
  "email": "admin@acme.com",
  "phone_number": "+919876543210",
  "password": "SecurePassword123"
}
```

**Response 200**
```json
{
  "message": "OTP sent to your email",
  "user_id": "usr_abc123",
  "email": "admin@acme.com"
}
```

> **Next step:** Store `email` in sessionStorage, navigate to `/verify-otp`.

---

### 2.2 Sign Up — Individual

```
POST /auth/signup/individual
Content-Type: application/json
```

**Request Body**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+919876543210",
  "password": "SecurePassword123"
}
```

**Response 200**
```json
{
  "message": "OTP sent to your email",
  "user_id": "usr_xyz789",
  "email": "john@example.com"
}
```

---

### 2.3 Verify OTP

```
POST /auth/verify-otp
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "john@example.com",
  "otp_code": "482910"
}
```

**Response 200**
```json
{
  "message": "Email verified successfully",
  "data": {}
}
```

---

### 2.4 Resend OTP

```
POST /auth/resend-otp
Content-Type: application/json
```

**Request Body**
```json
{ "email": "john@example.com" }
```

**Response 200**
```json
{ "message": "OTP resent successfully", "data": {} }
```

---

### 2.5 Login

```
POST /auth/login
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "admin@acme.com",
  "password": "SecurePassword123"
}
```

**Response 200**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": "usr_abc123",
  "user_type": "organization",
  "email": "admin@acme.com",
  "requires_onboarding": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | Store in localStorage. Include in all authenticated requests. |
| `user_type` | string | `"organization"` or `"individual"` or `"super_admin"` |
| `requires_onboarding` | boolean | If `true` (orgs only), redirect to `/auth/onboarding` before app access. |

> **After login:** Call `GET /auth/me` to load the full user profile.

---

### 2.6 Google OAuth — Web Flow

**Step 1: Get the Google redirect URL**

```
GET /auth/google/url?user_type=organization
```

**Response**
```json
"https://accounts.google.com/o/oauth2/auth?client_id=..."
```

**Step 2: Redirect the browser**

```js
window.location.assign(authUrl);
// Store user_type in sessionStorage before redirect
sessionStorage.setItem('trumarkz_google_user_type', userType);
```

**Step 3: Backend handles callback automatically**

Backend redirects to your frontend at `/auth/callback` or `/auth/google/callback` with:

```
https://your-frontend.com/auth/callback
  ?token=<jwt>
  &user_type=organization
  &requires_onboarding=false
  &email=user@gmail.com
  &user_id=usr_abc123
```

**Step 4: Callback page reads params and saves session**

```js
const token = searchParams.get('token');
tokenHelpers.save(token);
// then call GET /auth/me to load profile
```

> **Note:** Super Admin cannot use Google OAuth — only email/password login is allowed.

---

### 2.7 Google OAuth — Mobile / Android

```
POST /auth/google?user_type=organization
Content-Type: application/json
```

**Request Body**
```json
{ "token": "<google_id_token_from_sdk>" }
```

**Response 200** — Same structure as `/auth/login`

---

### 2.8 Complete Google Signup

Called when a new Google user hasn't chosen their account type yet.

```
POST /auth/complete-google-signup
Authorization: Bearer <google_jwt_token>
Content-Type: application/json
```

**Response 200**
```json
{
  "access_token": "eyJ...",
  "user_type": "organization",
  "requires_onboarding": true
}
```

---

### 2.9 Complete Onboarding (Orgs Only)

Call this when `requires_onboarding: true` after login.

```
POST /auth/onboarding
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "industry_type": ["Healthcare", "Education"],
  "gstin": "22AAAAA0000A1Z5",
  "business_reg_number": "U74999MH2020PTC123456",
  "address_line1": "Floor 4, Tech Park",
  "address_line2": "Andheri East",
  "address_line3": "Mumbai, Maharashtra",
  "use_cases": { "kyc": true, "employee_verification": false }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `industry_type` | ✅ | Array of industry strings the org belongs to |
| `gstin` | Optional | 15-character GST number |
| `business_reg_number` | Optional | CIN or registration number |
| `address_line1/2/3` | Optional | Address lines |
| `use_cases` | Optional | Key-value flags for platform use cases |

---

### 2.10 Get Current User Profile

```
GET /auth/me
Authorization: Bearer <token>
```

**Response 200**
```json
{
  "id": "usr_abc123",
  "user_type": "organization",
  "email": "admin@acme.com",
  "full_name": null,
  "phone_number": "+919876543210",
  "organization_name": "Acme Corp",
  "industry_type": ["Healthcare"],
  "gstin": "22AAAAA0000A1Z5",
  "business_reg_number": "U74999MH2020PTC123456",
  "address_line1": "Floor 4, Tech Park",
  "address_line2": "Andheri East",
  "address_line3": "Mumbai, Maharashtra",
  "use_cases": {},
  "onboarding_completed": true,
  "email_verified": true,
  "is_active": true,
  "storage_path": "orgs/usr_abc123/",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### 2.11 Forgot Password

```
POST /auth/forgot-password
Content-Type: application/json
```

**Request Body**
```json
{ "email": "john@example.com" }
```

> Always show a success message regardless of whether the email exists (prevents email enumeration).

---

### 2.12 Reset Password

```
POST /auth/reset-password
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "john@example.com",
  "otp_code": "183920",
  "new_password": "NewSecurePass456"
}
```

> After success, redirect to `/login`.

---

## 3. Verification

All verification endpoints require a valid JWT **except**:
- `GET /verification/categories`
- `POST /verification/upload/document`
- `POST /verification/upload/photo`

---

### 3.1 Get Product Categories

```
GET /verification/categories
```

**Response 200**
```json
[
  {
    "id": "cat_electronics",
    "category_name": "Electronics",
    "warranty_support": "enabled",
    "description": "Consumer electronics and gadgets"
  }
]
```

> Use this to populate category dropdowns for product verification.

---

### 3.2 Upload Single Human

```
POST /verification/single/human
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "full_name": "Rahul Sharma",
  "phone_number": "+919876543210",
  "email": "rahul@example.com",
  "dob": "1990-05-15",
  "aadhar_number": "1234 5678 9012",
  "pan_number": "ABCDE1234F",
  "address_line1": "123 MG Road",
  "address_line2": "Bandra West",
  "address_line3": "Mumbai",
  "pincode": "400050",
  "state": "Maharashtra",
  "country": "India",
  "industry_type": ["Healthcare"],
  "verification_types": ["aadhar", "pan"],
  "credential_visibility": "private",
  "template_id": "tmpl_abc123"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `full_name` | ✅ | Full legal name |
| `phone_number` | ✅ | Contact number |
| `email` | ✅ | Email to send invite link to |
| `dob` | Optional | Date of birth `YYYY-MM-DD` |
| `aadhar_number` | Optional | Aadhaar card number |
| `pan_number` | Optional | PAN card number |
| `address_line1/2/3` | Optional | Address fields |
| `pincode` / `state` | Optional | Postal code and state |
| `verification_types` | Optional | Array e.g. `["aadhar","pan","bgv"]` |
| `credential_visibility` | Optional | `"public"` or `"private"` |
| `template_id` | Optional | Credential template ID |

**Response 200**
```json
{
  "message": "Human uploaded successfully",
  "entity_id": "ent_abc123",
  "entity_type": "human",
  "invite_token": "tok_xyz789",
  "invite_link": "https://app.yourdomain.com/upload?token=tok_xyz789"
}
```

> Share `invite_link` with the person via email/SMS so they can upload their own documents without logging in.

---

### 3.3 Upload Single Product

```
POST /verification/single/product
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "category_id": "cat_electronics",
  "product_name": "iPhone 15 Pro",
  "custom_fields": {
    "serial_number": "DNPM3XYZABC",
    "model_number": "A2849",
    "color": "Natural Titanium"
  },
  "verification_types": ["authenticity"],
  "credential_visibility": "public",
  "template_id": "tmpl_prod001"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `category_id` | ✅ | From `GET /verification/categories` |
| `product_name` | ✅ | Name/model of the product |
| `custom_fields` | Optional | Any additional key-value metadata |
| `verification_types` | Optional | Verification checks to perform |
| `credential_visibility` | Optional | `"public"` or `"private"` |

---

### 3.4 Bulk Upload Humans (Excel)

```
POST /verification/bulk-upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields**

| Field | Required | Description |
|-------|----------|-------------|
| `file` | ✅ | `.xlsx` Excel file |
| `batch_name` | ✅ | Label for this batch e.g. `"Q2 Employee KYC"` |
| `description` | Optional | Notes about this batch |
| `industry_type` | Optional | Industry type for all records |
| `verification_types` | Optional | Comma-separated e.g. `"aadhar,pan"` |
| `credential_visibility` | Optional | `"public"` or `"private"` |
| `template_id` | Optional | Credential template to apply to all records |

**Required Excel Columns:** `full_name`, `email`, `phone_number`  
**Optional Columns:** `dob`, `aadhar_number`, `pan_number`, `address_line1`, `address_line2`, `address_line3`, `pincode`, `state`, `country`  
**Photo:** Embed images directly in the `Photo` column using Insert → Image → Place in Cell in Excel.

**Response 200**
```json
{
  "message": "Bulk upload complete",
  "batch_id": "batch_001",
  "entity_type": "human",
  "total_uploaded": 48,
  "total_skipped": 2,
  "successful_users": [
    { "entity_id": "ent_001", "email": "user@example.com", "invite_link": "..." }
  ],
  "skipped_users": [
    { "row": 5, "reason": "Missing email" }
  ],
  "errors": []
}
```

> Rows missing required fields are skipped and listed in `skipped_users`. Upload continues for valid rows.

---

### 3.5 Bulk Upload Products (Excel / CSV)

```
POST /verification/bulk-upload/products
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Required | Description |
|-------|----------|-------------|
| `file` | ✅ | `.xlsx`, `.xls`, or `.csv` file |
| `batch_name` | ✅ | Label for this product batch |
| `description` | Optional | Batch notes |

**Required Columns:** `product_name`, `category`  
All other columns are stored as `custom_fields` automatically.

---

### 3.6 Upload Document (Public — No Auth)

Called by the person using their invite link.

```
POST /verification/upload/document
Content-Type: multipart/form-data
```

| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ | Invite token from `invite_link` |
| `document_label` | ✅ | e.g. `"aadhar_front"`, `"pan_card"` |
| `file` | ✅ | Document image or PDF |

**Response 200**
```json
{
  "message": "Document uploaded successfully",
  "document_id": "doc_abc123",
  "document_url": "https://storage.googleapis.com/...",
  "version": 1
}
```

> Re-uploading the same `document_label` creates a new version.

---

### 3.7 Upload Photo (Public — No Auth)

```
POST /verification/upload/photo
Content-Type: multipart/form-data
```

| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ | Invite token from `invite_link` |
| `file` | ✅ | JPEG or PNG image |

**Response 200**
```json
{
  "message": "Photo uploaded successfully",
  "photo_url": "https://storage.googleapis.com/..."
}
```

> Re-uploading replaces the previous photo.

---

### 3.8 List All Verifications

```
GET /verification/all
Authorization: Bearer <token>
```

**Query Parameters**

| Param | Description |
|-------|-------------|
| `org_id` | Filter by organization ID |
| `batch_id` | Filter by batch ID |
| `status` | `"pending_verification"` / `"verified"` / `"failed"` |
| `limit` | Records to return (default: 100) |
| `offset` | Pagination offset (default: 0) |

**Response 200**
```json
{
  "total": 150,
  "pending": 30,
  "verified": 110,
  "failed": 10,
  "users": [
    {
      "id": "ent_001",
      "batch_id": "batch_001",
      "full_name": "Rahul Sharma",
      "verification_status": "verified",
      "verified_at": "2025-03-10T09:15:00Z",
      "documents": []
    }
  ]
}
```

---

### 3.9 Get Single Verification Record

```
GET /verification/user/{user_id}
Authorization: Bearer <token>
```

Returns full details including documents and verification status.

---

### 3.10 Update Verification Status

```
PATCH /verification/user/{user_id}/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "status": "verified",
  "reason": "All documents validated successfully"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `status` | Optional | `"pending_verification"` / `"verified"` / `"failed"`. **Omit to trigger mock** (80% verified / 20% failed). |
| `reason` | Optional | Human-readable reason for the decision |

---

### 3.11 Generate QR Code PDF

```
POST /verification/user/{user_id}/generate-qr
Authorization: Bearer <token>
```

Only works for records with `status = "verified"`.

**Response 200**
```json
{
  "message": "QR PDF generated successfully",
  "pdf_url": "https://storage.googleapis.com/.../credential.pdf",
  "qr_code_data": "https://verify.yourdomain.com/c/ent_001"
}
```

---

### 3.12 List Batches

```
GET /verification/batches
Authorization: Bearer <token>
```

**Response 200**
```json
[
  {
    "batch_id": "batch_001",
    "batch_name": "Q2 Employee KYC",
    "total_users": 50,
    "verified": 45,
    "failed": 3,
    "created_at": "2025-04-01T08:00:00Z"
  }
]
```

---

### 3.13 Get Batch Details

```
GET /verification/batches/{batch_id}
Authorization: Bearer <token>
```

Returns all records within a batch with metadata and progress summary.

---

## 4. Excel Template Generation

### 4.1 Human Excel Template

```
POST /verification/generate-human-template
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded
```

**Form Fields**

| Field | Required | Description |
|-------|----------|-------------|
| `headers` | ✅ | Comma-separated column names e.g. `"full_name,email,phone_number,dob"` |
| `verification_types` | Optional | Comma-separated e.g. `"aadhar,pan"` — adds instruction columns |

**Response:** `.xlsx` file download (binary blob)

> The backend **always appends a locked `Photo` column** automatically — do not include it in `headers`.

**Recommended base headers:** `full_name,email,phone_number,dob`

**Verification-specific headers to add:**

| Verification | Extra Columns |
|---|---|
| `identity` | `aadhar_number` |
| `pan` | `pan_number` |
| `driving` | `driving_licence_number`, `dl_expiry_date` |
| `education` | `college_name`, `degree`, `graduation_year` |
| `employment` | `employer_name`, `employment_duration`, `epfo_uan` |
| `address` | `address_line1`, `city`, `pincode` |
| `police` | `police_station`, `city_of_residence` |
| `compliance` | `product_name`, `batch_number`, `compliance_standard` |

---

### 4.2 Product Excel Template

```
POST /verification/products/template
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Required | Description |
|-------|----------|-------------|
| `category_id` | ✅ | From `GET /verification/categories` |
| `headers` | ✅ | Comma-separated column names for the product sheet |

**Response:** `.xlsx` file download (binary blob)

---

## 5. Credential Templates

### 5.1 Create Template

```
POST /verification/templates
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "template_name": "Employee ID Card",
  "verification_types": ["aadhar", "pan"],
  "json_data": { "layout": "card", "theme": "blue" },
  "html_code": "<div class='card'>...</div>"
}
```

### 5.2 Get Template

```
GET /verification/templates/{template_id}
Authorization: Bearer <token>
```

### 5.3 Update Template

```
PUT /verification/templates/{template_id}
Authorization: Bearer <token>
Content-Type: application/json
```

> Updating creates a **new version**. Previous versions are preserved.

### 5.4 Template Version History

```
GET /verification/templates/{template_id}/history
Authorization: Bearer <token>
```

**Response 200**
```json
[
  { "id": "tmpl_v3", "template_name": "Employee ID Card", "version": 3, "created_at": "2025-05-01T..." },
  { "id": "tmpl_v2", "template_name": "Employee ID Card", "version": 2, "created_at": "2025-04-01T..." }
]
```

---

## 6. Admin & Super Admin

> ⚠️ All endpoints in this section are restricted to `super-admin` role only.

### 6.1 List Users Grouped by Org

```
GET /auth/users/grouped
Authorization: Bearer <super_admin_token>
```

**Response 200**
```json
[
  {
    "org_id": "org_001",
    "organization_name": "Acme Corp",
    "users": [
      { "id": "usr_001", "full_name": "Admin", "email": "admin@acme.com", "user_type": "organization" }
    ]
  }
]
```

---

### 6.2 Promote Super Admin

```
POST /auth/promote-super-admin
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

**Request Body**
```json
{ "email": "admin@acme.com" }
```

**Response 200** — Success message string

> Grants super admin privileges to an **existing** user account.

---

### 6.3 Create Super Admin

```
POST /auth/create-super-admin
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "full_name": "Super Admin",
  "email": "superadmin@yourdomain.com",
  "password": "StrongPassword!"
}
```

**Response 200** — Success message string

> Creates a **brand new** account with super admin access. Share credentials securely.

---

### 6.4 Fetch Organization Industry Type

```
GET /auth/organization/{org_id}/industry-type
Authorization: Bearer <token>
```

**Response 200** — A plain string e.g. `"healthcare"`

---

### 6.5 Fetch Audit Logs

```
GET /auth/audit-logs/{batch_user_id}
Authorization: Bearer <super_admin_token>
```

**Response 200**
```json
[
  {
    "action": "status_update",
    "old_value": { "status": "pending_verification" },
    "new_value": { "status": "verified" },
    "changed_by": "usr_admin001",
    "created_at": "2025-05-10T14:30:00Z"
  }
]
```

---

## 7. Integration Flows

### 7.1 Organization Registration Flow

```
1. POST /auth/signup/organization
   → Receive user_id + email → Store email in sessionStorage

2. User enters OTP from email

3. POST /auth/verify-otp
   → Email verified

4. POST /auth/login
   → Receive access_token + requires_onboarding

5. If requires_onboarding = true:
   POST /auth/onboarding
   → onboarding_completed: true

6. GET /auth/me → Load full profile

7. Navigate to /org/dashboard
```

---

### 7.2 Human Verification Flow

```
1. POST /verification/single/human  (or POST /verification/bulk-upload)
   → Receive invite_token + invite_link

2. Send invite_link to person via email/SMS

3. Person opens invite_link → uploads their documents:
   POST /verification/upload/document  (public, no auth)
   POST /verification/upload/photo      (public, no auth)

4. Admin reviews / auto-verification runs:
   PATCH /verification/user/{id}/status

5. GET /verification/user/{id} → Check status
   → status == "verified"

6. POST /verification/user/{id}/generate-qr
   → Download PDF with QR code
```

---

### 7.3 Bulk Upload Flow

```
1. POST /verification/generate-human-template (download template)
   → Fill Excel with employee data offline

2. POST /verification/bulk-upload (upload filled Excel)
   → Receive batch_id + invite_links for all users

3. GET /verification/batches/{batch_id} → Monitor progress

4. PATCH /verification/user/{id}/status → Update status per record

5. POST /verification/user/{id}/generate-qr → Generate credentials
```

---

### 7.4 Google OAuth Web Flow

```
1. GET /auth/google/url?user_type=organization
   → Receive google_auth_url

2. sessionStorage.setItem('trumarkz_google_user_type', userType)
   window.location.assign(google_auth_url)

3. User logs in with Google

4. Backend handles callback automatically (/auth/google/callback)
   → Redirects frontend to /auth/callback?token=<jwt>&user_type=...

5. Frontend reads token from URL params
   → tokenHelpers.save(token)
   → GET /auth/me → Load profile

6. Navigate based on user_type and requires_onboarding
```

---

## 8. Error Handling

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| `200` | OK | Request successful |
| `401` | Unauthorized | Missing or invalid JWT token → Redirect to `/login` |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `422` | Unprocessable Entity | Validation error — check `detail` array |
| `500` | Internal Server Error | Contact backend team |

### Validation Error Format (422)

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### How `getApiError` Works

```js
// Parses API errors into a user-friendly string
const getApiError = (err, fallback = 'Something went wrong.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(d => d?.msg || d?.message).filter(Boolean).join('. ') || fallback;
  }
  return err?.response?.data?.message || fallback;
};
```

### Automatic 401 Handling

The Axios response interceptor automatically:
1. Clears `localStorage` (removes token and user data)
2. Redirects to `/login`

This happens on every 401 response **except** `/auth/login` itself.

---

## 9. Endpoint Quick Reference

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/auth/signup/organization` | ❌ | Register organization |
| POST | `/auth/signup/individual` | ❌ | Register individual |
| POST | `/auth/verify-otp` | ❌ | Verify email OTP |
| POST | `/auth/resend-otp` | ❌ | Resend OTP |
| POST | `/auth/login` | ❌ | Login → JWT |
| GET | `/auth/google/url` | ❌ | Get Google OAuth URL |
| GET | `/auth/google/callback` | ❌ | OAuth callback (backend handled) |
| POST | `/auth/google` | ❌ | Google OAuth (mobile) |
| POST | `/auth/complete-google-signup` | ✅ (Google JWT) | Choose user type |
| POST | `/auth/onboarding` | ✅ | Complete org onboarding |
| GET | `/auth/me` | ✅ | Get current user profile |
| POST | `/auth/forgot-password` | ❌ | Send reset OTP |
| POST | `/auth/reset-password` | ❌ | Reset password |

### Verification

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/verification/categories` | ❌ | Product categories |
| POST | `/verification/single/human` | ✅ | Upload 1 human |
| POST | `/verification/single/product` | ✅ | Upload 1 product |
| POST | `/verification/bulk-upload` | ✅ | Bulk upload humans (Excel) |
| POST | `/verification/bulk-upload/products` | ✅ | Bulk upload products |
| POST | `/verification/upload/document` | ❌ | Upload document (invite token) |
| POST | `/verification/upload/photo` | ❌ | Upload photo (invite token) |
| GET | `/verification/all` | ✅ | List all verifications (with filters) |
| GET | `/verification/user/{id}` | ✅ | Get one verification record |
| PATCH | `/verification/user/{id}/status` | ✅ | Update verification status |
| POST | `/verification/user/{id}/generate-qr` | ✅ | Generate QR PDF |
| GET | `/verification/batches` | ✅ | List all batches for org |
| GET | `/verification/batches/{id}` | ✅ | Get batch details |

### Templates & Generation

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| POST | `/verification/generate-human-template` | ✅ | Download human Excel template |
| POST | `/verification/products/template` | ✅ | Download product Excel template |
| POST | `/verification/templates` | ✅ | Create credential template |
| GET | `/verification/templates/{id}` | ✅ | Get template |
| PUT | `/verification/templates/{id}` | ✅ | Update template (new version) |
| GET | `/verification/templates/{id}/history` | ✅ | Template version history |

### Admin (Super Admin Only)

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| GET | `/auth/users/grouped` | ✅ Super Admin | All users grouped by org |
| POST | `/auth/promote-super-admin` | ✅ Super Admin | Grant super admin role |
| POST | `/auth/create-super-admin` | ✅ Super Admin | Create new super admin |
| GET | `/auth/organization/{id}/industry-type` | ✅ | Get org industry type |
| GET | `/auth/audit-logs/{id}` | ✅ Super Admin | Audit trail for user/batch |

---

*Generated for TruMarkZ Frontend Integration · June 2025*
