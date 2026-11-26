# Multi-Tenant SaaS Implementation Guide — Frontend Team

> **Target Tenants:** Narayani Sangh (`narayani`), Lumbini Sangh (`lumbini`), Gandaki Sangh (`gandaki`), and future transport associations (Sanghs).  
> **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query, Jotai.  
> **Companion Doc:** See [`multi-tenant-saas-backend-guide.md`](./multi-tenant-saas-backend-guide.md) for the shared API contract and Rust backend specification.

---

## 1. Architecture Overview

We are migrating from a single-tenant Narayani deployment to a **subdomain-based multi-tenant SaaS** architecture:

- `narayani.<domain>` → Narayani Yatayat Byawasayi Sangh (`tenantSlug = "narayani"`)
- `lumbini.<domain>` → Lumbini Truck Yatayat Byawasayi Sangh (`tenantSlug = "lumbini"`)
- `gandaki.<domain>` → Gandaki Yatayat Byawasayi Sangh (`tenantSlug = "gandaki"`)
- `admin.<domain>` → Platform SuperAdmin Console (`/platform/*`)

**Why subdomain routing?**
1. Browser `localStorage`, cookies, and React Query caches are automatically isolated per origin (zero risk of cross-tenant cache bleed when an operator has two Sanghs open).
2. Existing `/dashboard/*` and `/receipts/*` routes remain unchanged.
3. SMS receipt verification links naturally reflect each Sangh's domain and branding.

---

## 2. Current Codebase Audit (What Exists vs. What Must Change)

### Already Built (Reuse These)
- **`OrganizationProvider` & `OrganizationConfig`** (`contexts/organization-context.tsx`, `constants/organization.ts`, `provider/app-providers.tsx`): Already supports dynamic `organizationId`, `nameNepali`, `nameEnglish`, `logoUrl`, colors (`primaryColor`, `secondaryColor`, `accentColor`), `themeMode`, `borderRadius`, and `featureFlags`.
- **Platform Admin Shell** (`app/(platform)/platform/*`, `features/platform/components/OrganizationWorkspace.tsx`): UI scaffolding already exists (currently read-only with preview data).
- **Single Backend Proxy** (`app/backend-api/[...path]/route.ts`): Central server-side proxy for all API requests.
- **TQMS Branch Filtering** (`features/settings/api/grouped-settings.api.ts`, `features/settings/hooks/useTqmsSanghBranchFilter.ts`): Already supports scoping TQMS vehicles per `SanghBranch`.

### Hardcoded Single-Tenant Gaps to Remove
| File | Current Single-Tenant Coupling | Required Change |
|---|---|---|
| `constants/organization.ts` | Hardcoded `नारायणी यातायात व्यवसायी संघ` defaults | Keep neutral system fallback; hydrate real tenant config from server |
| `app/layout.tsx` | Does not pass `organization` / `organizationId` into `<Providers>` | Resolve tenant from request headers, fetch public tenant config, pass into `<Providers>` |
| `provider/app-providers.tsx` | Duplicate `'use client';` directive at lines 1 & 3 | Clean up duplicate directive while wiring tenant config |
| `app/backend-api/[...path]/route.ts` | Only forwards `accept`, `authorization`, `content-type` | Inject verified `x-tenant-slug` derived from `Host` header (never trust browser-sent `x-tenant-slug`) |
| `types/auth.ts` & `features/auth/api/auth-client.ts` | JWT only parses `email`, `role`, `exp`; roles limited to `Admin \| User \| Operator` | Parse `tenantId`, `tenantSlug`, `branchIds`; support `SuperAdmin`; reject JWT if `tenantSlug` mismatches active host |
| `shared/document-generation/components/CompanyBranding.tsx` | Hardcoded Narayani name, Hetauda address, regional branches, and `/narayani-logo.jpeg` | Consume dynamic `OrganizationConfig` / `CompanyBrandingOptions` (with `logoUrl`) |
| `shared/document-generation/templates/pdf/receipts/dot-matrix-receipt.template.tsx` | Hardcoded `<Image src="/narayani-logo.jpeg" />` | Use `branding.logoUrl` with graceful fallback if absent |
| `features/receipts/services/receipt-pdf-generator.ts` | Hardcoded `loadAsset('/narayani-logo.jpeg', 'receipt logo')` | Load `branding.logoUrl` (validate same-origin or allowed HTTPS CDN) with fallback when missing |
| `features/notifications/components/SmsTemplatesControl.tsx` | Hardcoded Narayani sample org name | Read `organization.nameNepali` from `useOrganization()` |
| `shared/report-export/*` | PDF/Excel report headers should pull org metadata dynamically | Pass active tenant branding (`useOrganization()`) into report export metadata |

---

## 3. Shared Frontend ↔ Backend Contract

### 3.1 Public Tenant Config Endpoint
Called server-side by `app/layout.tsx` (and cached per tenant slug with short revalidation, e.g., 60s):

- **Request:** `GET /api/v1/public/tenant-config`
  - Header injected by Next.js server/proxy: `X-Tenant-Slug: lumbini`
- **Response (`200 OK`):**
```json
{
  "tenantId": "tn_lumbini_01",
  "slug": "lumbini",
  "status": "ACTIVE",
  "nameNepali": "लुम्बिनी ट्रक यातायात व्यवसायी संघ",
  "nameEnglish": "Lumbini Truck Transport Association",
  "officeAddress": "मुख्य कार्यालय, बुटवल, रूपन्देही",
  "regionalOfficeText": "(शाखा कार्यालयहरू: भैरहवा, कपिलवस्तु)",
  "organizationPurpose": "सदस्यता / सदस्यता नवीकरण / हितकोष शुल्क",
  "logoUrl": "https://cdn.yourdomain.com/tenants/lumbini/logo.png",
  "theme": {
    "primaryColor": "#1E4E79",
    "secondaryColor": "#64748B",
    "accentColor": "#0F766E",
    "themeMode": "light",
    "borderRadius": "comfortable"
  },
  "currencySymbol": "Rs.",
  "tqmsSanghBranch": "Lumbini Truck Yatayat Byawasayi Sangh",
  "featureFlags": {
    "generalBilling": true,
    "smsNotifications": true,
    "insuranceEligibility": true
  }
}
```
- **Error Handling:**
  - `404 TENANT_NOT_FOUND`: Render a clean "संस्था फेला परेन (Tenant Not Found)" page instead of crashing.
  - `403 TENANT_SUSPENDED`: Render a "सेवा अस्थायी रूपमा स्थगित छ (Subscription Suspended)" screen with support contact.

### 3.2 JWT Claims Contract
```ts
export interface JwtClaims {
  sub: string;
  userId: number;
  email: string;
  name?: string;
  role: 'SuperAdmin' | 'Admin' | 'Operator' | 'User';
  tenantId: string | null;     // null only for platform SuperAdmin
  tenantSlug: string | null;   // e.g. "narayani" | "lumbini" | "gandaki"
  branchIds?: number[];        // empty = all branches in tenant
  exp: number;
}
```

### 3.3 Platform Admin Endpoints (For `admin.<domain>` / `/platform/*`)
- `GET /api/v1/platform/tenants` — list all tenants with status, user/branch counts, plan.
- `POST /api/v1/platform/tenants` — onboard a new Sangh (creates tenant, seeds default `SettingResource`, `PermissionResource` roles, and initial `Admin` account).
- `GET /api/v1/platform/tenants/:tenantId` — tenant detail & configuration.
- `PUT /api/v1/platform/tenants/:tenantId` — update branding, status (`ACTIVE`/`SUSPENDED`), feature flags, `tqmsSanghBranch`.
- `POST /api/v1/platform/tenants/:tenantId/logo` — upload tenant logo and receive CDN `logoUrl`.

---

## 4. Step-by-Step Frontend Implementation Plan

### Step 1: Tenant Resolution Middleware (`middleware.ts`)
Create `middleware.ts` at the project root:
1. Read `Host` header (strip port).
2. Resolution rules:
   - Production: `<slug>.yourdomain.com` → extract `<slug>`.
   - Special subdomain `admin.yourdomain.com` → set `x-portal-mode: platform`.
   - Local development (`localhost:3000`, `127.0.0.1:3000`):
     - Support `narayani.localhost:3000`, `lumbini.localhost:3000`, `gandaki.localhost:3000` (browsers resolve `*.localhost` natively to `127.0.0.1` with zero `/etc/hosts` edits).
     - Fallback to `process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'narayani'` when visiting bare `localhost:3000`.
3. Attach `x-tenant-slug` to forwarded request headers so Server Components and Route Handlers read one canonical value.
4. Block `/platform/*` on tenant subdomains (redirect to `/dashboard`) and block `/dashboard/*` on `admin.*` (redirect to `/platform`).

### Step 2: Update the Backend Proxy (`app/backend-api/[...path]/route.ts`)
1. Derive `tenantSlug` on the server from the request's `Host` header (using the same helper as `middleware.ts`).
2. **Never trust** a browser-supplied `x-tenant-slug` header — always overwrite it server-side before forwarding to `API_PROXY_TARGET`.
3. Add `x-tenant-slug` to the forwarded headers alongside `accept`, `authorization`, and `content-type`.

```ts
// app/backend-api/[...path]/route.ts
const tenantSlug = resolveTenantSlugFromHost(request.headers.get('host'));
if (tenantSlug) {
  headers['x-tenant-slug'] = tenantSlug;
}
```

### Step 3: Extend `OrganizationConfig` & Server Bootstrap (`app/layout.tsx`)
1. Extend `OrganizationConfig` in `constants/organization.ts` with receipt/document branding fields:
   - `slug?: string`
   - `officeAddress?: string`
   - `regionalOfficeText?: string`
   - `organizationPurpose?: string`
   - `tqmsSanghBranch?: string`
2. Create `lib/tenant/resolve-tenant.ts` (server-only):
   - Reads `headers()` → gets `x-tenant-slug`.
   - Fetches `/api/v1/public/tenant-config` from `API_PROXY_TARGET` with `next: { revalidate: 60, tags: [`tenant:${slug}`] }`.
3. In `app/layout.tsx`:
   - Fetch tenant config server-side.
   - Generate dynamic `metadata.title` using `tenant.nameNepali`.
   - Pass `organization={tenantConfig}` and `organizationId={tenantConfig.organizationId}` to `<Providers>`.
4. In `provider/app-providers.tsx`:
   - Remove the duplicate `'use client';` directive at the top of the file.

### Step 4: Auth & Cross-Tenant Session Guard (`types/auth.ts`, `features/auth/api/auth-client.ts`, `contexts/auth-context.ts`, `next.config.ts`)
1. Add `SuperAdmin` to `Role` enum in `types/auth.ts` and add `tenantId?: string | null`, `tenantSlug?: string | null`, `branchIds?: number[]` to `User`.
2. In `userFromAccessToken()` (`features/auth/api/auth-client.ts`):
   - Parse `tenantId`, `tenantSlug`, `branchIds` from JWT payload.
   - Verify `claims.tenantSlug` matches the active tenant slug (for non-`SuperAdmin` users). If mismatched, call `removeAccessToken()` and return `null` to prevent stale token reuse.
3. On logout (`logoutRequest()`), clear TanStack Query cache (`queryClient.clear()`) and any tenant-scoped `localStorage` state.
4. Update `next.config.ts` to configure `images.remotePatterns` so Next `<Image>` allows tenant logo CDN URLs (`https://cdn.yourdomain.com/**`).

### Step 5: Remove All Hardcoded Narayani Branding & Logos
1. **`shared/document-generation/components/CompanyBranding.tsx`**:
   - Accept `branding.logoUrl` in `CompanyBrandingOptions`.
   - Render `branding.logoUrl` (hide logo box cleanly or render a neutral emblem if not configured — never hardcode `/narayani-logo.jpeg`).
2. **`shared/document-generation/templates/pdf/receipts/dot-matrix-receipt.template.tsx`**:
   - Replace hardcoded `/narayani-logo.jpeg` with `branding.logoUrl`.
3. **`features/receipts/services/receipt-pdf-generator.ts`**:
   - Accept `logoUrl` from `branding` (or `OrganizationConfig`).
   - If `logoUrl` is HTTPS/external, proxy or ensure CORS headers are enabled on the logo CDN so `pdf-lib` can fetch and embed bytes cleanly.
   - Support both PNG (`pdfDoc.embedPng`) and JPEG (`pdfDoc.embedJpg`) based on content-type/magic bytes.
4. **All report exports (`shared/report-export/*`)**:
   - Pull header organization name, address, and branch list from `useOrganization()` / active `CompanyBrandingOptions` rather than static constants.
5. **Login & Sidebar (`features/auth/components/LoginHeader.tsx`, sidebar header)**:
   - Render active tenant `logoUrl`, `nameNepali`, and `nameEnglish` from `useOrganization()`.
6. **SMS Templates (`features/notifications/components/SmsTemplatesControl.tsx`)**:
   - Use `organization.nameNepali` as the preview sample for `organizationName`.

### Step 6: Wire Up the Platform Admin Console (`app/(platform)/platform/*`)
Replace `PLATFORM_PREVIEW_ORGANIZATIONS` in `features/platform/` with real API calls:
- **Tenant Directory (`/platform/organizations`)**: List all Sanghs, search/filter by status, quick toggle `ACTIVE`/`SUSPENDED`.
- **Onboard New Sangh Wizard**: Form for `slug`, `nameNepali`, `nameEnglish`, `officeAddress`, `regionalOfficeText`, `tqmsSanghBranch`, logo upload, theme colors, initial Branch, and initial Admin email/password.
- **Tenant Detail (`/platform/organizations/[organizationId]/*`)**: Edit branding, feature flags, TQMS branch filter, and view usage metrics.

---

## 5. Local Development Setup for Multiple Tenants

Add to `.env.local`:
```env
API_PROXY_TARGET=https://localhost:8443/api/v1
NEXT_PUBLIC_DEFAULT_TENANT=narayani
```

Test multiple Sanghs simultaneously in your browser with zero DNS/hosts setup:
- `http://narayani.localhost:3000/dashboard`
- `http://lumbini.localhost:3000/dashboard`
- `http://gandaki.localhost:3000/dashboard`
- `http://admin.localhost:3000/platform`

---

## 6. Frontend Acceptance & Testing Checklist

- [ ] Visiting `narayani.localhost:3000` shows Narayani branding, logo, colors, and Narayani's receipts/members only.
- [ ] Visiting `lumbini.localhost:3000` shows Lumbini branding, logo, colors, and Lumbini's receipts/members only.
- [ ] Logging in on `narayani` and copying the JWT to `lumbini` is immediately rejected by both frontend claim validation and backend middleware.
- [ ] PDF receipt generation (`receipt-pdf-generator.ts`), dot-matrix printing, and centralized Excel/PDF report exports render the active tenant's Nepali name, address, and logo (PNG & JPEG supported).
- [ ] Public receipt verification links (`/receipts/[id]` or PDF link in SMS) render the correct tenant's logo and receipt data.
- [ ] Unknown subdomain (`unknown.localhost:3000`) renders a clean 404 Tenant Not Found page; suspended tenant renders a Suspension notice.
- [ ] Existing `tests/` suite passes (`tsc --noEmit`, `eslint`, and new unit tests for `resolveTenantSlugFromHost`, JWT tenant guard, and dynamic `CompanyBranding`).
