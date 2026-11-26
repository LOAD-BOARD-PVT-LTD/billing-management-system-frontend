# Multi-Tenant SaaS Implementation Guide — Backend Team (Rust)

> **Target Tenants:** Narayani Sangh (`narayani`), Lumbini Sangh (`lumbini`), Gandaki Sangh (`gandaki`), and future transport associations (Sanghs).  
> **Stack:** Rust API (`/api/v1/{action}/{resource_name}`), Generic Resource Store, JWT Auth, Audit Trail & Action Logs.  
> **Companion Doc:** See [`multi-tenant-saas-frontend-guide.md`](./multi-tenant-saas-frontend-guide.md) for the Next.js frontend integration.

---

## 1. Tenancy & Data Isolation Strategy

### Recommended Model: **Shared Database + Mandatory `tenant_id` (with PostgreSQL RLS)**
For 3 to 100+ transport associations (Sanghs), a shared database with strict `tenant_id` scoping gives:
- Single schema migration pipeline across all Sanghs.
- Simple backup, monitoring, and low infrastructure cost.
- Defense-in-depth when paired with PostgreSQL **Row-Level Security (RLS)** so a forgotten `WHERE tenant_id = $1` clause can never leak Narayani's data to Lumbini.

### Complete Resource Inventory (`ResourceName` in `src/resource.rs`)
Every resource falls into one of three isolation scopes:

| Scope | Resources | Isolation Rule |
|---|---|---|
| **Tenant-Scoped (13 resources)** | `VehicleResource`, `UserResource`, `BillResource`, `MemberResource`, `ReportResource`, `SettingResource`, `PermissionResource`, `VehicleCategoryResource`, `BillingRuleResource`, `BillingEntityResource`, `BranchResource`, `ActionLogsResource`, `AuditTrailResource` | **MUST** carry a non-null `tenant_id`. Every `create`, `read`, `update`, `delete`, `search`, and `streams/search` query MUST filter by `tenant_id` from the verified JWT. |
| **Internal / System (1 resource)** | `CacheResource` | Namespaced by `tenant_id` in cache keys (`{tenant_id}:{key}`). Never exposed to tenant roles directly. |
| **Platform-Level (New)** | `tenants` table, `platform_users` table | Managed only by `SuperAdmin` under `/api/v1/platform/*`. |

---

## 2. Database Schema & Zero-Downtime Migration

### 2.1 New `tenants` Table
```sql
CREATE TABLE tenants (
    id                   TEXT PRIMARY KEY,              -- e.g. 'tn_narayani_01'
    slug                 TEXT NOT NULL UNIQUE,          -- e.g. 'narayani', 'lumbini', 'gandaki'
    status               TEXT NOT NULL DEFAULT 'ACTIVE' -- 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
                         CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    plan                 TEXT NOT NULL DEFAULT 'STANDARD',
    name_nepali          TEXT NOT NULL,
    name_english         TEXT NOT NULL,
    office_address       TEXT NOT NULL DEFAULT '',
    regional_office      TEXT NOT NULL DEFAULT '',
    organization_purpose TEXT NOT NULL DEFAULT 'सदस्यता / सदस्यता नवीकरण / हितकोष शुल्क',
    logo_url             TEXT,
    theme_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    feature_flags_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    tqms_sangh_branch    TEXT NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants (LOWER(slug));
```

### 2.2 Adding `tenant_id` to Existing Generic Resource Store
1. Seed Narayani as the first tenant:
   ```sql
   INSERT INTO tenants (id, slug, name_nepali, name_english, office_address, regional_office, logo_url, tqms_sangh_branch)
   VALUES (
       'tn_narayani_01',
       'narayani',
       'नारायणी यातायात व्यवसायी संघ',
       'Narayani Yatayat Byawasayi Sangh',
       'मुख्य कार्यालय, हेटौंडा - ४, परिजातपथ',
       '(क्षेत्रीय तथा शाखा कार्यालयहरू: चितवन, परासी, काठमाडौं, पोखरा)',
       '/narayani-logo.jpeg',
       'Narayani Yatayat Byawasayi Sangh'
   )
   ON CONFLICT (slug) DO NOTHING;
   ```
2. Add `tenant_id` column (nullable first → backfill `'tn_narayani_01'` → set `NOT NULL` + foreign key to `tenants(id)`).
3. Add composite indexes on all hot access paths:
   - `(tenant_id, resource_name, id)`
   - `(tenant_id, resource_name, created_at DESC)`
   - Unique constraints MUST include `tenant_id`:
     - Users: `UNIQUE (tenant_id, LOWER(email))` (so the same email can exist in separate Sanghs without conflict).
     - Receipt numbers: `UNIQUE (tenant_id, branch_code, fiscal_year, sequence_number)`.
     - Branches: `UNIQUE (tenant_id, branch_code)`.
     - Fee heads / Billing rules: scoped by `(tenant_id, fiscal_year, name)`.

### 2.3 PostgreSQL Row-Level Security (Strongly Recommended)
Set the transaction-local tenant variable right after authenticating the request:
```sql
SELECT set_config('app.current_tenant_id', $1, true);
```
Enable RLS on the resource table:
```sql
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON resources
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
```
> **Note:** Platform `SuperAdmin` queries should use a dedicated bypass role or explicit platform repository functions outside the tenant RLS context.

---

## 3. Authentication, Tenant Context & Security Invariants

### 3.1 Request Tenant Resolution Rules (CRITICAL)
| Route Type | How `tenant_id` Is Resolved | Security Check |
|---|---|---|
| **Public routes** (`GET /api/v1/public/tenant-config`, `POST /api/v1/login`, public receipt verification) | Resolve `tenants` row from `X-Tenant-Slug` header (injected by Next.js proxy from `Host`). | Return `404 TENANT_NOT_FOUND` if slug does not exist; `403 TENANT_SUSPENDED` if `status != 'ACTIVE'`. |
| **Authenticated tenant routes** (`/api/v1/create/*`, `/read/*`, `/update/*`, `/delete/*`, `/search/*`, `/streams/search/*`, `/tqms/*`, `/dashboard/*`) | **ALWAYS derive `tenant_id` from the signed JWT claim.** | If `X-Tenant-Slug` header is also present and does NOT match JWT `tenant_slug`, reject immediately with `403 TENANT_MISMATCH` and log `AuditAction::AccessDenied`. |
| **Platform routes** (`/api/v1/platform/*`) | Require `role == "SuperAdmin"` in JWT. | Reject any tenant user (`Admin`, `Operator`, `User`) with `403 FORBIDDEN`. |

### 3.2 Updated JWT Claims
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub user_id: i64,
    pub email: String,
    pub name: Option<String>,
    pub role: String,                // "SuperAdmin" | "Admin" | "Operator" | "User"
    pub tenant_id: Option<String>,   // Some("tn_lumbini_01") for tenant users; None for SuperAdmin
    pub tenant_slug: Option<String>, // Some("lumbini")
    pub branch_ids: Vec<i64>,        // empty = all branches within tenant
    pub exp: usize,
}
```
- **Login (`POST /api/v1/login`):**
  1. Resolve tenant from `X-Tenant-Slug` (unless logging into `admin` platform portal).
  2. Reject login if tenant `status != "ACTIVE"` (`403 TENANT_SUSPENDED`).
  3. Look up user by `(tenant_id, LOWER(email))` — never globally by email alone!
  4. Mint JWT containing `tenant_id`, `tenant_slug`, `role`, `branch_ids`.

### 3.3 Generic Resource Handler Enforcement (`src/actions.rs`, `src/api_stream.rs`)
Update all 6 generic handlers to accept an `AuthTenantContext` extractor:
- `POST /api/v1/create/{resource_name}`: Force `row.tenant_id = ctx.tenant_id`. Ignore any `tenant_id` in client payload.
- `GET /api/v1/read/{resource_name}/{id}`: Filter `WHERE tenant_id = ctx.tenant_id` (both for `id = "all"` and specific `id`). Return `404` (never `403`) if an ID belongs to another tenant so IDs cannot be enumerated.
- `PUT /api/v1/update/{resource_name}/{id}`: Filter `WHERE id = $1 AND tenant_id = ctx.tenant_id`.
- `DELETE /api/v1/delete/{resource_name}/{id}`: Filter `WHERE id = $1 AND tenant_id = ctx.tenant_id`.
- `GET /api/v1/search/{resource_name}/...` & `/streams/search/...`: Filter `WHERE tenant_id = ctx.tenant_id` before applying query/limit/offset.

---

## 4. Per-Tenant RBAC (`PermissionResource`)

Each tenant stores its own role-based `PermissionResource` documents (one per `role` per `tenant_id`):

```json
{
  "resource_name": "PermissionResource",
  "inner_content": {
    "schemaVersion": "1.0",
    "tenantId": "tn_lumbini_01",
    "role": "Admin",
    "status": "ACTIVE",
    "branchIds": [],
    "allow": {
      "BillResource": ["CREATE", "READ", "UPDATE", "CANCEL", "CORRECT", "PRINT", "REPRINT"],
      "MemberResource": ["CREATE", "READ", "UPDATE", "DELETE", "CHANGE_OWNER", "RECONCILE", "BLACKLIST", "UNBLACKLIST"],
      "VehicleResource": ["CREATE", "READ", "UPDATE", "DELETE", "CONFIRM_NUMBER_CHANGE", "DISPLACE"],
      "VehicleCategoryResource": ["CREATE", "READ", "UPDATE", "DELETE"],
      "BillingRuleResource": ["CREATE", "READ", "UPDATE", "DELETE"],
      "BillingEntityResource": ["CREATE", "READ", "UPDATE", "DELETE"],
      "BranchResource": ["CREATE", "READ", "UPDATE", "DELETE"],
      "ReportResource": ["READ", "EXPORT"],
      "SettingResource": ["READ", "UPDATE", "MANAGE_FISCAL_YEAR", "MANAGE_SMS"],
      "UserResource": ["CREATE", "READ", "UPDATE", "DELETE", "RESET_PASSWORD"],
      "PermissionResource": ["READ", "UPDATE", "ASSIGN"],
      "ActionLogsResource": ["READ"],
      "AuditTrailResource": ["READ"]
    },
    "deny": {
      "BillResource": ["DELETE"],
      "PermissionResource": ["DELETE"],
      "ActionLogsResource": ["CREATE", "UPDATE", "DELETE"],
      "AuditTrailResource": ["CREATE", "UPDATE", "DELETE"]
    },
    "requireAudit": [
      "BillResource:CANCEL",
      "BillResource:CORRECT",
      "VehicleResource:CONFIRM_NUMBER_CHANGE",
      "PermissionResource:ASSIGN"
    ]
  },
  "external_content": {}
}
```
- **Evaluation order:**
  1. Verify `permission.tenant_id == ctx.tenant_id` and `status == "ACTIVE"`.
  2. If `branch_ids` is non-empty, verify target branch is in `branch_ids`.
  3. Check `deny` first (`deny` always overrides `allow`).
  4. Check `allow`; default decision is `DENY`.
  5. On denial, record `AuditAction::AccessDenied` in `AuditTrailResource` (scoped to `ctx.tenant_id`).
  6. If `"{resource}:{action}"` is in `requireAudit`, mandate an `AuditTrailResource` entry.

---

## 5. Required New & Updated API Endpoints

### 5.1 Public Tenant Config (Consumed by Next.js on Page Load)
- `GET /api/v1/public/tenant-config`
  - Reads `X-Tenant-Slug` header.
  - Returns **only public, non-secret fields** (never return SMS API keys, TQMS credentials, or internal secrets!):
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

### 5.2 Platform Tenant Management (`SuperAdmin` Only)
| Method & Path | Purpose |
|---|---|
| `GET /api/v1/platform/tenants` | List all tenants with status, plan, user count, branch count |
| `POST /api/v1/platform/tenants` | Create & provision a new tenant (atomic transaction) |
| `GET /api/v1/platform/tenants/{tenant_id}` | Fetch tenant metadata & settings summary |
| `PUT /api/v1/platform/tenants/{tenant_id}` | Update branding, `status`, `tqms_sangh_branch`, `feature_flags` |
| `POST /api/v1/platform/tenants/{tenant_id}/logo` | Upload tenant logo (PNG/JPEG, max 2 MB) to object storage / R2 and save `logo_url` |

### 5.3 Tenant Onboarding Transaction (`POST /api/v1/platform/tenants`)
When creating a new Sangh (e.g., `lumbini` or `gandaki`), execute atomically inside one DB transaction:
1. Insert row in `tenants` with unique `slug`.
2. Seed default `SettingResource` for that `tenant_id` (with `integrations.tqms.SanghBranch`, active fiscal year, default VAT/cancel window).
3. Seed default `BranchResource` (Head Office branch + `BranchCode`).
4. Seed default `PermissionResource` templates (`Admin`, `Operator`, `User`).
5. Create initial `UserResource` (`Admin`) for the new Sangh.
6. Record platform audit entry.

### 5.4 Domain Integrations & Receipts
- **TQMS Search (`POST /api/v1/tqms/search`):**
  - Filter `cache_results` strictly to `VehicleResource` rows where `tenant_id = ctx.tenant_id`! (Critical: Lumbini must never see Narayani's cached `VehicleResource` records when searching a vehicle plate.)
- **Receipt Numbering & Sequences:**
  - Keep `BillResource.id` globally unique while maintaining a per-tenant sequence (`tenant_receipt_seq`) for displayed receipt numbers (`{BranchCode}.{tenant_seq}`) scoped by `(tenant_id, branch_code, fiscal_year)`.
- **SMS Credentials & Gateway:**
  - Read SMS provider API keys/sender IDs from the active tenant's `SettingResource` (or encrypted `tenant_secrets` table), never a single global env var.
- **Dashboard Statistics (`/api/v1/dashboard/*`):**
  - Scope all member counts, active/expired counts, and revenue aggregates by `tenant_id = ctx.tenant_id`.
- **Audit Logs & Action Logs (`src/audit.rs`, `src/log.rs`):**
  - Include `tenant_id` on every `AuditTrailResource` and `ActionLogsResource` record automatically from `AuthTenantContext`.

---

## 6. Phased Rollout & Verification Checklist

### Rollout Order
1. **Phase 1 (Schema + Backfill):** Add `tenants` table, seed `narayani`, add & backfill `tenant_id` on all tables, add indexes + RLS policies.
2. **Phase 2 (Auth + Middleware):** Add `tenant_id` / `tenant_slug` to JWT, enforce `AuthTenantContext` across all generic `/api/v1/*`, `/tqms/search`, and `/dashboard/*` routes.
3. **Phase 3 (Public Config & Platform APIs):** Ship `GET /api/v1/public/tenant-config` and `/api/v1/platform/tenants/*` provisioning endpoints.
4. **Phase 4 (Provision Pilot Tenants):** Create `lumbini` and `gandaki` via `POST /api/v1/platform/tenants` and run cross-tenant penetration tests.

### Backend Acceptance & Security Test Checklist
- [ ] **Cross-tenant read test:** Authenticated user from `lumbini` calling `GET /api/v1/read/BillResource/all` returns 0 records belonging to `narayani`.
- [ ] **Cross-tenant ID probe test:** `lumbini` calling `GET /api/v1/read/BillResource/{narayani_bill_id}` returns `404` (not `200`, not leaking existence).
- [ ] **Cross-tenant update/delete test:** `lumbini` calling `PUT` or `DELETE` on a `narayani` resource ID fails with `404` and mutates 0 rows.
- [ ] **Header spoofing test:** `lumbini` JWT sent with `X-Tenant-Slug: narayani` is rejected with `403 TENANT_MISMATCH` and logs `AuditAction::AccessDenied`.
- [ ] **TQMS cache isolation test:** `POST /api/v1/tqms/search` for the same vehicle plate returns only the calling tenant's `cache_results`.
- [ ] **Suspended tenant test:** Setting `tenants.status = 'SUSPENDED'` blocks both `POST /login` and existing JWTs with `403 TENANT_SUSPENDED`.
- [ ] **Zero-regression test for Narayani:** All existing Narayani bills, members, vehicles, settings, and receipt PDFs continue working identically after backfill.
