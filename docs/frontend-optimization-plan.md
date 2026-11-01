# Prioritized Frontend Optimization & Implementation Plan

**Document Version:** 1.0.0  
**Date:** 2026-10-31  
**Project:** Billing Management System (Next.js 16.3.4 / React 19.2.8)  
**Author:** Senior Frontend Architect & Performance Engineer  

---

## 1. Overview & Execution Strategy

This implementation plan defines the step-by-step roadmap to eliminate performance bottlenecks, memory waste, redundant network requests, state-management anti-patterns, and architectural risks identified in `docs/frontend-performance-audit.md`.

In accordance with system requirements, **no modifications will be applied until this plan is reviewed and explicitly approved**. Once approved, changes will be executed incrementally in logical batches, with automated tests (`npm test`), type checking (`tsc --noEmit`), and linting run after each step.

---

## 2. Prioritized Task List

### Batch 1: Critical Architecture & Network Optimization (P0)

#### Task 1.1: Persistent HTTPS Agent with Connection Pooling in API Proxy
- **Issue:** Ephemeral `new https.Agent` instantiated per proxied request.
- **Root Cause:** Dynamic instantiation inside request handler `app/backend-api/[...path]/route.ts`.
- **Impact:** Eliminates TCP socket reuse, incurs full TLS handshake per API request, adds 50–200ms latency.
- **Priority:** **P0**
- **Files Affected:** `app/backend-api/[...path]/route.ts`
- **Proposed Change:**
  1. Define a shared module-level `https.Agent` configured with `keepAlive: true`, `maxSockets: 50`, `maxFreeSockets: 10`, `timeout: 60000`.
  2. Pass the singleton agent to `https.request`.
- **Validation Method:**
  - Verify proxy requests succeed across `GET`, `POST`, `PUT`, `DELETE`.
  - Benchmark proxy latency across sequential and concurrent requests.

#### Task 1.2: 401 Unauthorized Interception & Automatic Session Invalidation
- **Issue:** 401 responses do not clear tokens or trigger re-authentication.
- **Root Cause:** Absence of HTTP status code interception in `apiRequest` and `authenticatedFetch`.
- **Impact:** Users remain in a broken authenticated state with failing actions until manual refresh.
- **Priority:** **P0**
- **Files Affected:**
  - `lib/api/request.ts`
  - `lib/authentication/authenticated-fetch.ts`
  - `contexts/auth-context.ts`
  - `features/auth/api/token-storage.ts`
- **Proposed Change:**
  1. In `apiRequest` / `authenticatedFetch`, catch HTTP 401.
  2. Clear `billing_access_token` from `token-storage`.
  3. Dispatch a window event `auth:unauthorized`.
  4. In `AuthProvider`, listen for `auth:unauthorized` and update state to `isAuthenticated: false, user: null`.
- **Validation Method:**
  - Unit test 401 interception and event dispatch.
  - Verify redirect to `/login` when token is invalidated.

---

### Batch 2: State Management & Redundant Sync Cleanup (P1)

#### Task 2.1: Eliminate Redundant Dual-Store Synchronization (Jotai vs React Query)
- **Issue:** React Query hooks write to Jotai atoms via `useEffect` without active consumers.
- **Root Cause:** Dual state management libraries storing the same server data.
- **Impact:** Extra render passes, unnecessary React context churn, potential race conditions.
- **Priority:** **P1**
- **Files Affected:**
  - `features/billing-rules/hooks/useBillingRules.ts`
  - `features/billing-rules/store/atom.ts`
  - `features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes.ts`
  - `features/vehicle/type/hooks/useVehicleTypes.ts`
  - `features/vehicle/store/vehicle-type-atoms.ts`
  - `features/members/components/MembersPage.tsx`
- **Proposed Change:**
  1. Remove `billingRuleResponseAtom` and the `useEffect` sync from `useBillingRules.ts`.
  2. In `MembersPage.tsx`, read directly from `billingVehicleTypesQuery.data` and `tqmsVehicleTypesQuery.data` instead of `useAtomValue(...)`.
  3. Deprecate and remove redundant atoms in `features/vehicle/store/vehicle-type-atoms.ts`.
- **Validation Method:**
  - Run `npm test` (verify `billing-rules.test.ts` and `membership-billing.test.ts` pass).
  - Verify Members page renders correctly on direct link navigation.

---

### Batch 3: Rendering & Component Architecture Optimization (P1 / P2)

#### Task 3.1: Memoization & Form State Isolation in `BillingWorkspace.tsx`
- **Issue:** Monolithic re-renders across 8 heavy child components on every keystroke.
- **Root Cause:** Unmemoized child components receiving high-churn state.
- **Impact:** Input lag when typing amounts, discounts, or adjusting month counts.
- **Priority:** **P1**
- **Files Affected:**
  - `features/billing/components/create-bill/BillingWorkspace.tsx`
  - `features/billing/components/create-bill/BillingHeader.tsx`
  - `features/billing/components/create-bill/BillingItems.tsx`
  - `features/billing/components/create-bill/BIllingItemRow.tsx` (and rename to `BillingItemRow.tsx`)
  - `features/billing/components/create-bill/PaymentSection.tsx`
  - `features/billing/components/create-bill/VehicleBilling.tsx`
  - `features/billing/components/membership/MembershipHistory.tsx`
  - `features/billing/components/vehicle-summary/VehicleSummary.tsx`
- **Proposed Change:**
  1. Wrap `BillingHeader`, `BillingItems`, `PaymentSection`, `VehicleBilling`, `VehicleSummary`, and `MembershipHistory` in `React.memo`.
  2. Memoize callbacks (`onItemChange`, `onDiscountChange`, `onMonthChange`) with `useCallback`.
  3. Inside `MembershipHistory.tsx`, wrap `history` derivation with `useMemo(() => ..., [records, vehicleId, vehicleNumber])`.
- **Validation Method:**
  - Run React profiling or re-render count checks during typing in discount/item inputs.
  - Verify billing calculations and receipt generation tests pass.

#### Task 3.2: Optimize Report Derived Data Calculations
- **Issue:** `IncomeReportPage.tsx` recalculates 4 arrays (`fiscalYears`, `branches`, `users`, `feeHeads`) with `Set`, `map`, and `sort` on every render.
- **Root Cause:** Missing `useMemo` on filter options.
- **Impact:** Frame drops during table sorting and pagination on large reports.
- **Priority:** **P2**
- **Files Affected:**
  - `features/reports/components/IncomeReportPage.tsx`
  - `features/reports/components/FeeHeadWiseReportPage.tsx`
- **Proposed Change:**
  1. Wrap `fiscalYears`, `branches`, `users`, and `feeHeads` derivations in `useMemo` dependent on `rows`.
  2. Memoize report summary metrics (`summaryTotal`, `summaryTransactions`).
- **Validation Method:**
  - Filter and paginate 2,000+ synthetic rows; verify 0 frame drops and instant page changes.

---

### Batch 4: Bundle Size & Code Splitting (P1 / P2)

#### Task 4.1: Lazy-Load Heavy PDF Libraries in Registry Page
- **Issue:** `pdf-lib` and `@pdf-lib/fontkit` imported statically at top of `TqmsMemberRegistryPage.tsx`.
- **Root Cause:** Static import of export-only dependencies.
- **Impact:** Adds ~300KB+ to initial page load bundle.
- **Priority:** **P1**
- **Files Affected:** `features/vehicle/tqms/components/TqmsMemberRegistryPage.tsx`
- **Proposed Change:**
  1. Convert `import { PDFDocument, rgb } from 'pdf-lib'` and `import fontkit from '@pdf-lib/fontkit'` to dynamic `await import(...)` inside `downloadUniqueVehicleNumbersPdf`.
  2. Remove obsolete `import 'regenerator-runtime/runtime';`.
- **Validation Method:**
  - Check Next.js build route size output for `/dashboard/tqms-member-registry`.
  - Verify PDF generation on export button click works seamlessly.

#### Task 4.2: Dependency Cleanup in `package.json`
- **Issue:** Unused packages `html-to-image` and `next-auth` installed.
- **Root Cause:** Legacy/abandoned experiments.
- **Impact:** Unnecessary dependencies in package-lock and node_modules.
- **Priority:** **P2**
- **Files Affected:** `package.json`
- **Proposed Change:**
  1. Remove `"html-to-image"` and `"next-auth"` from dependencies in `package.json`.
  2. Remove `"regenerator-runtime"` once dynamic import is complete.
- **Validation Method:**
  - Run `npm test` and `npm run build` to verify clean build without missing module errors.

---

### Batch 5: Layout & Scroll Restoration Optimization (P1 / P3)

#### Task 5.1: Stabilize Dashboard Layout & Throttle Scroll Persistence
- **Issue:** `key={pathname}` forces full unmount/remount of `<motion.main>`; unthrottled `scroll` event triggers continuous RAF calls and `sessionStorage` writes.
- **Root Cause:** Overly aggressive Framer Motion page transitions and manual scroll restoration.
- **Impact:** Unnecessary DOM destruction on route navigation; main thread work during scrolling.
- **Priority:** **P1**
- **Files Affected:** `app/(dashboard)/dashboard/layout.tsx`
- **Proposed Change:**
  1. Remove `key={pathname}` from `<motion.main>` to preserve persistent layout shell without subtree destruction.
  2. Throttle or debounce the scroll position saver (e.g., save on page exit or debounce by 200ms).
  3. Ensure motion obeys `shouldReduceMotion`.
- **Validation Method:**
  - Verify smooth tab switching between Dashboard, Receipts, and Billing without scroll jumps or DOM flickers.

#### Task 5.2: Fix File Casing for Windows/Linux Cross-Platform Compatibility
- **Issue:** `BIllingItemRow.tsx` has inconsistent capital 'I' casing.
- **Root Cause:** Typo in initial file creation.
- **Impact:** Git case-sensitivity conflicts between Windows and Linux CI environments.
- **Priority:** **P3**
- **Files Affected:**
  - `features/billing/components/create-bill/BIllingItemRow.tsx` -> `BillingItemRow.tsx`
  - `features/billing/components/create-bill/BillingItems.tsx` (import reference)
- **Proposed Change:** Rename file to `BillingItemRow.tsx` and update import in `BillingItems.tsx`.
- **Validation Method:**
  - Verify build passes on both case-insensitive and case-sensitive filesystems.

---

## 3. Implementation Guardrails & Verification Schedule

1. **Safety First**: Financial calculations, API response shapes, and validation logic in `bill-validation.ts` must remain 100% authoritative and unchanged.
2. **Step-by-step Verification**:
   - After each batch:
     - `npm test` (all 91 tests must pass)
     - `node_modules/.bin/tsc.cmd --noEmit` (0 TypeScript errors)
     - `node_modules/.bin/eslint.cmd` (0 ESLint errors)
3. **Approval Gate**: Stop and await user confirmation before modifying source code.

