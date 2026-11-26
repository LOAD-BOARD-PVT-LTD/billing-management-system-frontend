# Frontend Test Suite Standards

## Directory Layout

Tests are organized by feature domain under `tests/` so related specs and shared helpers stay easy to discover and maintain:

- `tests/architecture/` — security guards, state cleanup, memoization, bundle hygiene, and resilience specs
- `tests/billing/` — billing rules, fee heads, entity selection, membership/general billing, VAT
- `tests/dashboard/` — KPI metrics, fiscal year filtering, analytics, and statistics fallback
- `tests/members/` — member calculations, arrears, displacement, TQMS member registry
- `tests/receipts/` — receipt API, owners, bill-ID sorting, period automation, PDF generation & public URLs
- `tests/reconciliation/` — TQMS reconciliation, member billing history, UI-layer invariants
- `tests/reports/` — centralized PDF/Excel export engine, Mahasang & member transaction reports
- `tests/settings/` — grouped settings, fiscal year management, VAT/insurance/SMS notification settings
- `tests/vehicles/` — VehicleResource CRUD, blacklist, categories, management tags, phone overrides, TQMS sync
- `tests/helpers/` — shared reusable test helpers (`api-mock.ts`, `fixtures.ts`, `source-assertions.ts`)

## Authoring Standards

1. **Always use path aliases (`@/`)** instead of fragile `../../` relative imports.
2. **Reuse `tests/helpers/`** rather than duplicating mock factories or file-read boilerplate:
   - `mockApiClient` / `mockGlobalFetch` from `@/tests/helpers/api-mock` (always restore in `afterEach`).
   - `createTestReceipt`, `createTestBillingVehicle`, `createTestVehicleResource` from `@/tests/helpers/fixtures`.
   - `readWorkspaceFile`, `readPackageJson`, `assertNoForbiddenPatterns` from `@/tests/helpers/source-assertions`.
3. **Follow AAA structure** (Arrange → Act → Assert) with descriptive `describe` / `it` or `test` blocks covering happy paths, edge cases, and error states.
4. **TypeScript compatibility:** `tsconfig.json` targets `ES2017`, so use `BigInt(0)` rather than `0n` literals, and avoid `any`.
5. **No leftover global mutations:** Any stubbed `apiClient`, `fetch`, `localStorage`, or environment flag must be restored cleanly after each test.

## Running Tests

- Full suite: `npm run test`
- Domain suites: `npm run test:architecture`, `npm run test:billing`, `npm run test:dashboard`, `npm run test:members`, `npm run test:receipts`, `npm run test:reconciliation`, `npm run test:reports`, `npm run test:settings`, `npm run test:vehicles`
