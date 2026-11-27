# Backend Reports Architecture & Business Logic Guide

> **Scope:** Authoritative engineering specification to move all 5 current Billing System reports from browser-side aggregation (`GET read/BillResource/all` + full-collection joins in React) to dedicated, paginated, RBAC-enforced backend reporting APIs.

---

## 1. Executive Summary & Current Bottlenecks

Currently, all 5 report pages execute report filtering, joining, grouping, total computation, and PDF/Excel preparation in the user's browser by fetching full resource collections (`BillResource`, `VehicleResource`, `BillingRuleResource`, `VehicleCategoryResource`, `MemberResource`, `BranchResource`, `UserResource`, `SettingResource`).

Moving these computations to backend endpoints resolves:
- **Payload & Memory Scaling:** Eliminates downloading all historical `BillResource` and `VehicleResource` documents on every report visit.
- **Filter Integrity & Cascading Logic:** Guarantees `वित्तीय वर्ष` → `आम्दानी शीर्षक`, `Admin/Staff` → `शाखा`, and `शाखा` → `प्रयोगकर्ता` scoping consistently across UI, pagination, and exports.
- **RBAC Enforcement:** Prevents branch-restricted staff from querying or receiving receipt/user data outside their assigned branch.
- **Consistent Calculations & Exports:** Ensures UI tables, summary cards, pagination totals, CSV/Excel, and PDFs compute identical figures.

---

## 2. Shared Cross-Report Filter, Date & Revenue Rules

Every backend report endpoint MUST implement these exact domain rules identically to existing frontend behavior.

### 2.1 Common Query Parameters

| Parameter | Type | Default | Rules |
|---|---|---|---|
| `fiscalYear` | `string` | Current BS fiscal year or `'all'` | Canonicalize Nepali digits and dashes (`२०८३-८४`, `2083/2084` → `2083/84`). Compare against `bill.fiscalYearId` / `fiscalYearName` / canonical label. `'all'` disables fiscal-year filtering. |
| `branch` | `string` | `'all'` | Matched case-insensitively (`TRIM(LOWER(...))`) against `branch.name`. **RBAC override:** Non-Admin users assigned to a branch MUST have `branch` locked server-side to their assigned branch. |
| `user` | `string` | `'all'` | Matched case-insensitively against receipt creator `userName`, `createdBy.name`, and `createdBy.username` (email), **including user name↔email alias resolution** from `UserResource`. |
| `feeHead` | `string` | `'all'` | Matches if **any** `items[]` entry has `feeHeadId == feeHead` OR normalized `title == normalize(feeHead)`. |
| `dateFrom` | `YYYY-MM-DD` (AD) | optional | Strictly valid Gregorian calendar date (`YYYY-MM-DD`). |
| `dateTo` | `YYYY-MM-DD` (AD) | optional | Strictly valid Gregorian calendar date (`YYYY-MM-DD`). |
| `dateBasis` | `'paymentDate' \| 'billingDate'` | `'paymentDate'` | Selects date column/logic (see Section 2.2). |
| `page` | `integer >= 1` | `1` | 1-indexed page number. |
| `pageSize` | `integer` | report default (15 / 50 / 100) | Max cap `200` for JSON API; exports stream all matching rows. |
| `sortBy` | `string` | report default | Whitelisted column identifier per report. |
| `sortDir` | `'asc' \| 'desc'` | `'desc'` | Sort direction. |

### 2.2 Date-Basis Rules (`dateBasis`)

1. **`dateBasis = 'paymentDate'`** (all reports):
   - Effective date = `DATE(content.paidAt)` (or `receipt.paymentDate || receipt.billingDate` in `YYYY-MM-DD`).
   - Filter: `(!dateFrom || effectiveDate >= dateFrom) && (!dateTo || effectiveDate <= dateTo)`.
2. **`dateBasis = 'billingDate'`** (Report-specific behavior):
   - **Income Report & Fee-Head Wise Report & Vehicle Category Report:** Effective date = `receipt.billingDate`; matches `(!dateFrom || billingDate >= dateFrom) && (!dateTo || billingDate <= dateTo)`.
   - **Mahasangh Report:** Evaluates **validity period interval overlap**:
     - `periodStart = content.periodStart || billingDate`
     - `periodEnd = content.periodEnd || validUntil || periodStart`
     - Include when `(!dateFrom || (periodEnd && periodEnd >= dateFrom)) && (!dateTo || (periodStart && periodStart <= dateTo))`.
3. **Invalid Date Range Rule:**
   - If `dateFrom` or `dateTo` is malformed, OR `dateFrom > dateTo`, return `200 OK` with **empty rows (`[]`)**, `total: 0`, and zeroed summary totals (never `500`, and do not return unfiltered data).

### 2.3 Revenue & Status Rules

- **`PAID` vs `CANCELLED` / `PENDING`:**
  - Monetary summations (`totalIncome`, `membershipIncome`, `otherIncome`, `amount`, category totals, grand totals) **count ONLY `status === 'PAID'` receipts**. Cancelled/pending receipts contribute `0` to monetary totals.
  - Transaction count KPIs count distinct `receiptId`s with `status === 'PAID'` (except table row counts in Mahasangh / Member Transaction history which list matching receipts with `0` monetary value for non-`PAID`).
- **Unicode & Vehicle Identity Normalization:**
  - `normalizeKey(str)`: convert Devanagari digits `[०-९]` → ASCII `[0-9]`, Unicode `.normalize('NFKC')`, strip zero-width chars, lowercase, collapse whitespace. For matching vehicle numbers across snapshots, strip non-alphanumeric Unicode characters (`[^\p{L}\p{N}]`).

---

## 3. Shared Filter Options API (`GET /api/v1/reports/filter-options`)

Powers the reusable report filter bar (`ReportFiltersCard`, `IncomeReportFilters`) and `ReceiptFilters` so dropdowns never show stale cross-year fee heads, missing system branches, or users from unrelated branches.

### Request
```http
GET /api/v1/reports/filter-options?fiscalYear=2083/84&branch=चितवन%20शाखा&reportType=mahasang
```

### Exact Server Logic for Each Field
1. **`fiscalYears`**:
   - Union of configured `BillingRuleResource` fiscal years + distinct fiscal years present in `BillResource`, sorted descending/Nepali order.
2. **`branches` (RBAC-aware)**:
   - **If `currentUser.role == 'Admin'` (or user has no assigned branch):** return ALL active + historical system branches from `BranchResource` merged with distinct non-empty `BillResource.branch.name` values (excluding `'—'`), deduplicated case-insensitively, sorted (`'ne'`).
   - **If non-Admin with assigned branch (`user.branchId` / `user.branchName`):** return only `[assignedBranch.name]`.
3. **`feeHeads` (Scoped by `fiscalYear`)**:
   - **If `fiscalYear != 'all'`:** return union of:
     - `BillingRuleResource` (`FEE_HEAD`) records whose `fiscalYearId` matches `fiscalYear` (raw ID, code, name, or canonicalized `2083/84` label).
     - Distinct `(feeHeadId, title)` pairs appearing on `BillResource` receipts belonging to `fiscalYear`.
   - **If `fiscalYear == 'all'`:** return all `FEE_HEAD`s and all receipt item fee heads.
   - Deduplicate by `feeHeadId` (falling back to normalized `title`), sort alphabetically (`'ne'`).
4. **`users` (Scoped by `branch`)**:
   - Exclude user email duplicates whenever `user.name` is non-empty (store `email` as an internal alias for filtering, not as a second dropdown entry).
   - **If `branch == 'all'`:** return ALL `UserResource` users (`name || email`) merged with distinct `BillResource` creators not covered by an email alias.
   - **If `branch != 'all'`:** return `UserResource` users where `user.branchId == selectedBranch.id` OR `LOWER(user.branchName) == LOWER(branch)`, merged with distinct creators (`userName` / `createdBy`) of receipts issued under `selectedBranch`.
5. **`vehicleTypes`, `vehicleTypeGroups`, `defaultVehicleTypes`** *(when `reportType=mahasang` or `vehicle-category`)*:
   - `vehicleTypes`: deduplicated union of `VehicleCategoryResource[].vehicleTypes`, `VehicleResource` distinct `VehicleType` values (excluding placeholder `'सवारी प्रकार उपलब्ध छैन'`), `BillResource` distinct `vehicle.vehicleType`, and `SettingResource.reports.mahasang` presets.
   - `categories`: distinct `VehicleCategoryResource.category` names.
   - `defaultVehicleTypes` & `vehicleTypeGroups`: resolved from `SettingResource.reports.mahasang` (`resolveDefaultMahasangVehicleTypes`).

### Response Contract (`200 OK`)
```json
{
  "fiscalYears": ["2083/84", "2082/83"],
  "branches": ["मुख्य कार्यालय (हेटौंडा)", "चितवन शाखा", "पोखरा शाखा"],
  "users": ["Admin", "Chitwan Staff"],
  "feeHeads": [
    { "value": "fh-1", "label": "सदस्यता शुल्क" },
    { "value": "fh-2", "label": "हितकोष शुल्क" }
  ],
  "categories": ["बस", "ट्रक"],
  "vehicleTypes": ["Truck 10T", "Tipper", "Container"],
  "vehicleTypeGroups": [
    { "id": "grp-heavy", "name": "भारी सवारी", "vehicleTypes": ["Truck 10T", "Tipper"] }
  ],
  "defaultVehicleTypes": ["Truck 10T", "Tipper"]
}
```

---

## 4. Detailed Specifications for All 5 Reports

---

### Report 1: Income Report (आम्दानी रिपोर्ट)

- **Data Endpoint:** `GET /api/v1/reports/income`
- **Export Endpoint:** `GET /api/v1/reports/income/export?format=xlsx|csv|pdf`

#### Query Params
`fiscalYear`, `branch`, `user`, `feeHead`, `dateFrom`, `dateTo`, `dateBasis`, `page` (default `1`), `pageSize` (default `15`), `sortBy` (`paymentDate | receiptNumber | customerName | receiptTotal`), `sortDir` (`desc`).

#### Exact Business Logic
1. Expand each matching `BillResource` receipt into item lines (`items[]`).
2. Group **unique receipts** after filtering (`receiptRows`, deduplicated by `receiptId`) so paginated table shows 1 row per receipt (matching current UI `IncomeReportPage.tsx`), sorted by `sortBy`/`sortDir`.
3. **KPI Summary (across ALL matching receipts, not just current page):**
   - `totalIncome = SUM(receipt.totalAmount WHERE status == 'PAID')` (summed once per distinct `receiptId`, avoiding double-counting multi-item bills).
   - `totalTransactions = COUNT(DISTINCT receiptId WHERE status == 'PAID')`.
4. **Export (`buildAmdaniExportRows`):** 14-column landscape Amdani report:
   - Splits `receiptTotal` into `membershipAmount` (`billingType != 'GENERAL' ? totalAmount : 0`) and `otherAmount` (`billingType == 'GENERAL' ? totalAmount : 0`).
   - Renders owner/operator lines using multi-owner rule (when `operatorName` differs from `ownerName`: line 1 = `संचालक: <operatorName>`, line 2 = `धनीको नाम: <ownerName>`).
   - Summary footer: total count, `सदस्यता`, `अन्य`, `जम्मा रू.`.

#### JSON Response
```json
{
  "summary": {
    "totalIncome": 145000,
    "totalTransactions": 62
  },
  "rows": [
    {
      "id": "101-0",
      "receiptId": "101",
      "receiptNumber": "CIT.101",
      "paymentDate": "2026-11-10",
      "billingDate": "2026-11-10",
      "periodStart": "2083-07-01",
      "periodEnd": "2083-07-30",
      "billingMonths": 1,
      "customerName": "राम बहादुर",
      "operatorName": "हरि थापा",
      "vehicleNumber": "BA 01 KHA 1234",
      "vehicleType": "Bus",
      "branchName": "चितवन शाखा",
      "userName": "Chitwan Staff",
      "fiscalYear": "2083/84",
      "paymentMethod": "नगद",
      "note": "",
      "feeHeadId": "fh-1",
      "feeTitle": "सदस्यता शुल्क",
      "billingEntity": "संघ",
      "amount": 2000,
      "membershipIncome": 2000,
      "otherIncome": 0,
      "receiptTotal": 2000,
      "status": "PAID"
    }
  ],
  "pagination": { "page": 1, "pageSize": 15, "total": 62, "totalPages": 5 }
}
```

---

### Report 2: Fee-Head Wise Report (शीर्षक अनुसार रिपोर्ट)

- **Data Endpoint:** `GET /api/v1/reports/fee-head-wise`
- **Export Endpoint:** `GET /api/v1/reports/fee-head-wise/export?format=xlsx|pdf`

#### Query Params
`fiscalYear`, `branch`, `user`, `feeHead`, `dateFrom`, `dateTo`, `dateBasis`, `page` (default `1`), `pageSize` (default `15`).

#### Exact Business Logic
1. Resolve `configuredFeeHeads` for the selected `fiscalYear` (ordered by `FeeHead.displayOrder`).
2. Filter matching `BillResource` receipts (must satisfy `fiscalYear`, `branch`, `user`, `feeHead`, `dateFrom`–`dateTo`).
3. Sort receipts by `billingDate DESC, receiptNumber DESC`.
4. **Dynamic Visible Columns (`visibleFeeHeads`):**
   - Sum `item.amount` per `feeHeadId` across ALL matching receipts.
   - Keep only configured fee heads where `(feeHeadFilter == 'all' || id == feeHeadFilter)` AND `allTotals.amounts[id] != 0`.
5. **Totals:**
   - `pageTotals`: per-column sum + `receipt.totalAmount` sum across rows on the current page.
   - `allTotals`: per-column sum + `receipt.totalAmount` sum across ALL matching receipts.
6. **Table Grouping:** Frontend groups `rows` sequentially by `billingDate` for date subtotal rows (backend returns ordered rows + per-row `amounts` map + `visibleFeeHeads` + `configuredFeeHeads` + `pageTotals` + `allTotals`).

#### JSON Response
```json
{
  "configuredFeeHeads": [
    { "id": "fh-1", "name": "सदस्यता शुल्क", "displayOrder": 1 },
    { "id": "fh-2", "name": "हितकोष शुल्क", "displayOrder": 2 }
  ],
  "visibleFeeHeads": [
    { "id": "fh-1", "name": "सदस्यता शुल्क", "displayOrder": 1 }
  ],
  "rows": [
    {
      "receiptId": "101",
      "receiptNumber": "CIT.101",
      "billingDate": "2026-11-10",
      "vehicleNumber": "BA 01 KHA 1234",
      "vehicleType": "Bus",
      "customerName": "राम बहादुर",
      "operatorName": "हरि थापा",
      "phone": "9841000001",
      "address": "Hetauda",
      "note": "",
      "totalAmount": 2000,
      "amounts": { "fh-1": 2000 }
    }
  ],
  "pageTotals": { "amounts": { "fh-1": 2000 }, "total": 2000 },
  "allTotals": { "amounts": { "fh-1": 40000 }, "total": 40000 },
  "pagination": { "page": 1, "pageSize": 15, "total": 20, "totalPages": 2 }
}
```

---

### Report 3: Vehicle Category Report (सवारी वर्गअनुसार रिपोर्ट)

- **Data Endpoint:** `GET /api/v1/reports/vehicle-category`
- **Export Endpoint:** `GET /api/v1/reports/vehicle-category/export?format=xlsx|pdf`

#### Query Params
`fiscalYear`, `branch`, `feeHead`, `category` (`'all'` or category name), `vehicleType` (`'all'` or vehicle type), `dateFrom`, `dateTo`, `page` (default `1`), `pageSize` (default `50`, allowed `25 | 50 | 100`).

#### Exact Business Logic
1. **Category Mapping:** Resolve `category` from `VehicleCategoryResource` by matching normalized `bill.vehicle.vehicleType` (or `VehicleTypeId`) inside `category.vehicleTypes[]`:
   - Blank vehicleType → `'वर्ग उपलब्ध छैन'`
   - Unmapped non-empty vehicleType → `'वर्गीकृत नभएको'`
2. **Route Permit Extraction:** Read `route` and `routePermitExpiry` (`ExpiryBs || ExpiryAd || expiryDate`) from `BillResource.inner_content.vehicle.Compliance.RoutePermit` (or fallback from latest TQMS/VehicleResource metadata if cached).
3. **Filtering:** Apply `fiscalYear`, `branch`, `feeHead` (`items[].feeHeadId == feeHead || items[].title == feeHead`), `category`, `vehicleType`, and `dateFrom <= billingDate <= dateTo`.
4. **Revenue Columns:**
   - `paidAmount = status == 'PAID' ? totalAmount : 0`
   - `membershipIncome = paidAmount` (for current report rows, matching `makeRows` in `VehicleCategoryReportPage.tsx`), `otherIncome = 0`, `total = paidAmount`.
5. **Totals:** Compute `pageTotals` and `allTotals` (`membership`, `other`, `total`).

#### JSON Response
```json
{
  "rows": [
    {
      "receiptId": "101",
      "receiptNumber": "CIT.101",
      "vehicleNumber": "BA 01 KHA 1234",
      "category": "बस",
      "vehicleType": "Bus",
      "route": "Narayangadh - Kathmandu",
      "routePermitExpiry": "2083-12-30",
      "ownerName": "राम बहादुर",
      "operatorName": "हरि थापा",
      "note": "",
      "membershipIncome": 2000,
      "otherIncome": 0,
      "total": 2000,
      "periodMonths": 1,
      "paymentMethod": "नगद",
      "billingDate": "2026-11-10",
      "periodStart": "2083-07-01",
      "periodEnd": "2083-07-30"
    }
  ],
  "pageTotals": { "membership": 2000, "other": 0, "total": 2000 },
  "filteredTotals": { "membership": 85000, "other": 0, "total": 85000 },
  "pagination": { "page": 1, "pageSize": 50, "total": 42, "totalPages": 1 }
}
```

---

### Report 4: Mahasangh Report (महासंघ रिपोर्ट)

- **Data Endpoint:** `POST /api/v1/reports/mahasang` *(using `POST` body or `GET` query so large `vehicleTypes[]` arrays of 50+ types don't exceed URL length limits)*
- **Export Endpoint:** `POST /api/v1/reports/mahasang/export` (body includes `filters` + `visibleColumns` + `format: 'xlsx' | 'pdf'`)

#### Filter Parameters
`fiscalYear`, `branch`, `feeHead`, `vehicleTypes: string[]` *(when omitted/not overridden in first call, backend may still apply client-passed `selectedVehicleTypes` or `SettingResource.reports.mahasang` defaults; empty array `[]` = all vehicle types)*, `dateFrom`, `dateTo`, `dateBasis` (`'paymentDate' | 'billingDate'`), `search` (optional global table search across vehicle numbers, owner, phone, receipt number, vehicleType, note), `page`, `pageSize`.

#### Exact Business Logic
1. **Default Vehicle Type Preset Resolution (`SettingResource.reports.mahasang`):**
   - If `defaultGroupId` exists in `vehicleTypeGroups`, default = that group's `vehicleTypes`; else `defaultVehicleTypes`.
2. **Current & Previous Vehicle Resolution (Critical Join Logic):**
   - Build vehicle history index from `VehicleResource`:
     - Match receipt's snapshot vehicle to `VehicleResource` using priority order:
       1. `previousVehicleIds` (`reconciliationAudit` / ownership history) matching `bill.vehicle.id`
       2. `previousVehicleNumbers` (normalized) matching `bill.vehicle.vehicleNumber`
       3. Current `VehicleId`
       4. Current `VehicleNumber` (normalized)
     - `vehicleNumber` = matched current `VehicleResource.VehicleNumber` (fallback: snapshot `bill.vehicle.vehicleNumber`).
     - `previousVehicleNumber` = if normalized snapshot number differs from `vehicleNumber`, return snapshot number; else `currentVehicle.previousVehicleNumbers.at(-1) || '—'`.
3. **Income Separation:**
   - `paidTotal = receipt.status === 'PAID' ? receipt.totalAmount : 0`
   - `membershipIncome = billingType === 'MEMBERSHIP' ? paidTotal : 0`
   - `otherIncome = billingType === 'GENERAL' ? paidTotal : 0`
4. **Contact Resolution:** `ownerPhone = customer.phone || vehicle.smsPhone || vehicle.phone || '—'`.
5. **Summary Cards (across ALL filtered rows):** `totalBills`, `totalMembership`, `totalOther`.

#### JSON Response
```json
{
  "summary": {
    "totalBills": 120,
    "totalMembership": 240000,
    "totalOther": 15000
  },
  "rows": [
    {
      "id": "101",
      "vehicleNumber": "GA PRA-12-12-GHA-1223",
      "previousVehicleNumber": "GA PRA-12-12-GHA-1221",
      "vehicleType": "Truck 10T",
      "ownerName": "श्याम धनी",
      "operatorName": "राम संचालक",
      "ownerPhone": "9841000001",
      "note": "",
      "receiptNumber": "CIT.101",
      "membershipIncome": 2000,
      "otherIncome": 0,
      "total": 2000,
      "periodMonths": 1,
      "paymentMethod": "नगद",
      "billingDate": "2026-11-10",
      "periodStart": "2083-07-01",
      "periodEnd": "2083-07-30"
    }
  ],
  "pagination": { "page": 1, "pageSize": 25, "total": 120, "totalPages": 5 }
}
```

---

### Report 5: Member Transaction Report (सदस्यता तथा कारोबार रिपोर्ट)

Split into **2 fast endpoints** + export (avoids downloading all members/receipts before the user types a search query):

1. **Candidate Search:** `GET /api/v1/reports/member-transactions/search?q=<query>`
   - **Exact Search Logic:**
     - Normalize `q` using Devanagari→ASCII digits + lowercase alphanumeric strip (`normalizeSearchValue`). Blank `q` returns `[]`.
     - Group `MEMBERSHIP` `BillResource` receipts by normalized `vehicleNumber`.
     - Enrich with `MemberResource` (for `memberNumber`) and `TQMS Registry` (`VehicleResource` / TQMS sync).
     - Match `q` against `vehicleNumber`, `memberNumber`, `ownerName`, `phone`, `address`, `vehicleType`, `branchName`, AND any receipt's `receiptNumber`, `branchName`, `paymentMethod`, `customerName`, or `feeTitles`.
     - Enforce branch RBAC for non-Admin staff.
     - Return top matches (`id`, `vehicleNumber`, `memberNumber`, `ownerName`, `phone`, `address`, `vehicleType`, `branchName`, `transactionCount`).

2. **Member Profile & Paginated Transactions:** `GET /api/v1/reports/member-transactions/:vehicleKey?page=1&pageSize=100`
   - **Exact Business Logic:**
     - **Profile Data:** Combines member info (`memberNumber`, `billingDate`, `periodStart`, `expiryDate`), `VehicleResource` (`sawariDhaniName`, `sanchalakName`, `phone`, `address`), `VehicleCategoryResource` (category name for vehicle type), `lastPrintedAt` from latest receipt's `auditHistory`, and live/cached `GET tqms/vehicle_details/{vehicleNumber}` compliance (`PolicyNumber`, `Insurance`, `CheckPass`, `Bluebook` formatted BS preferred over AD).
     - **Transactions:** Membership receipts for that vehicle sorted by `paymentDate`.
     - **Extra Amount Calculation per Row:**
       $$\text{extraAmount} = \max\left(0,\; \text{receipt.totalAmount} - \sum \text{receipt.items[].amount}\right)$$
       *(Captures VAT or manual rounding/adjustments beyond item base sums).*
     - **Totals:** `totalPaid = SUM(totalAmount WHERE status == 'PAID')`, `totalExtra = SUM(extraAmount)`.

3. **Export:** `GET /api/v1/reports/member-transactions/:vehicleKey/export?format=xlsx|pdf`

---

## 5. Database Indexing & Read-Model Strategy

To keep all 5 reports under `<150ms` even at `500,000+` receipts, project `BillResource` writes/cancellations/corrections into indexed relational/materialized tables (or indexed JSONB columns if PostgreSQL):

1. **`report_receipts` (1 row per `BillResource`):**
   - Columns: `receipt_id (PK)`, `receipt_number`, `billing_type`, `status`, `branch_id`, `branch_name_lower`, `fiscal_year_id`, `fiscal_year_canonical`, `created_by_id`, `created_by_name`, `created_by_username`, `vehicle_id`, `vehicle_number_norm`, `vehicle_type_norm`, `customer_name`, `customer_phone`, `payment_date`, `billing_date`, `period_start`, `period_end`, `billing_months`, `subtotal`, `discount`, `vat_amount`, `total_amount`, `payment_method`, `paid_at`, `created_at`.
   - **Composite Indexes:**
     - `(fiscal_year_canonical, branch_name_lower, status, payment_date DESC)`
     - `(fiscal_year_canonical, branch_name_lower, status, billing_date DESC)`
     - `(vehicle_id, billing_type, payment_date DESC)`
     - `(vehicle_number_norm, billing_type)`
2. **`report_receipt_items` (1 row per line item inside `BillResource.items[]`):**
   - Columns: `receipt_id (FK)`, `item_index`, `fee_head_id`, `fee_title_norm`, `billing_entity_id`, `amount`.
   - **Index:** `(fee_head_id, receipt_id)` and `(receipt_id)`.
3. **`report_vehicle_aliases` (derived from `VehicleResource` history / `reconciliationAudit`):**
   - Maps `(alias_vehicle_id, alias_vehicle_number_norm)` → `current_vehicle_id`, `current_vehicle_number`, `previous_vehicle_number`.

---

## 6. Security & RBAC Rules (Must Enforce Server-Side)

1. Never trust client-supplied `branch` alone for non-Admin users — derive `branchId` / `branchName` from the authenticated user's session/DB record (`UserResource`) when `role != 'Admin'`.
2. Enforce tenant isolation (`tenant_id` / organization scope) on every report table and `SettingResource` lookup.
3. Validate `format` and `sortBy` against strict server-side allowlists before building SQL/PDF/CSV outputs; escape CSV cells against formula injection (`=`, `+`, `-`, `@`).

---

## 7. Phased Frontend Migration Checklist

1. **Phase 1 — Filter Options Cutover:** Replace `buildReport*Options()` + full `useBranches`/`useUsers`/`useBillingRules` calls on report pages with `GET /api/v1/reports/filter-options`.
2. **Phase 2 — Member Transaction Search & Profile:** Switch `MemberTransactionReportPage` from loading all `BillResource` + `MemberResource` + `TQMS Registry` records to `/member-transactions/search` + `/member-transactions/:vehicleKey`.
3. **Phase 3 — Paginated Report Tables (Income, Fee-Head Wise, Vehicle Category, Mahasangh):** Replace `useReceipts()` + client-side `filter*` calls with server-paginated endpoints.
4. **Phase 4 — Server-Side Exports (`/export`):** Wire Excel/PDF export buttons to stream directly from backend `/export` endpoints (using the existing headless/PDF template layout), then deprecate client-side `GET read/BillResource/all` calls in the reports feature.
