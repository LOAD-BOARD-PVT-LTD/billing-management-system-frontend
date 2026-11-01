# Comprehensive Frontend Performance & Architecture Audit

**Document Version:** 1.0.0  
**Date:** 2026-10-31  
**Project:** Billing Management System (Next.js 16.3.4 / React 19.2.8)  
**Author:** Senior Frontend Architect & Performance Engineer  

---

## 1. Executive Summary Table

| Area | Existing Problem | Impact | Priority | Proposed Solution |
|---|---|---|---|---|
| **API & Network** | `app/backend-api/[...path]/route.ts` creates a new `https.Agent` on every single HTTP proxy request. | Destroys TCP keep-alive and TLS session reuse; adds 50–200ms latency to every API call. | **P0** | Reuse a single, persistent `https.Agent` with `keepAlive: true` and connection pooling. |
| **Security & Auth** | 401 Unauthorized API responses do not trigger token invalidation or logout; user remains in a broken authenticated state. | Stale sessions cause repeated silent failures and confusing UI errors until manual reload. | **P0** | Intercept 401 in `apiRequest` / `authenticatedFetch`, remove token, and dispatch auth reset event. |
| **State Management** | Redundant dual state: React Query queries synchronize into Jotai atoms (`billingRuleResponseAtom`, `billingVehicleTypesAtom`, `tqmsVehicleTypesAtom`) via `useEffect`. | Redundant renders, extra cycles, race conditions where atoms are unpopulated on direct route entry. | **P1** | Eliminate dual-store sync; read directly from React Query cache/hooks. Remove unused atoms. |
| **Rendering** | `BillingWorkspace.tsx` (536 lines) holds all form state and re-renders 8 heavy unmemoized child components on every keystroke. | Severe input lag when typing amounts, discounts, or searching items on low-power devices. | **P1** | Memoize child components (`React.memo`) and isolate high-frequency form state into subcomponents. |
| **Bundle & Code Splitting** | `utils/translations.ts` is 350 KB (5,599 lines) with nested dictionaries imported across almost every client component. | 350KB static dictionary inflates common client chunks and delays initial page interactivity. | **P1** | Split translation modules, lazy-load language dictionaries, or extract heavy translations out of the critical bundle. |
| **Bundle & Code Splitting** | `TqmsMemberRegistryPage.tsx` statically imports `pdf-lib` and `@pdf-lib/fontkit` at the top of the file. | Inflates page bundle by ~300KB+ for users who never trigger the PDF export action. | **P1** | Dynamically import `pdf-lib` and `@pdf-lib/fontkit` inside the click handler (`await import(...)`). |
| **Rendering & Hydration** | `app/(dashboard)/dashboard/layout.tsx` remounts `<motion.main>` with `AnimatePresence` and `key={pathname}` on every route transition. | Destroys DOM nodes, forces full subtree remounts, loses scroll positions, and causes layout shifts. | **P1** | Remove route-level full remounting; apply motion to page contents or use lightweight transition classes. |
| **Rendering & DOM** | `app/(dashboard)/dashboard/layout.tsx` attaches an unthrottled `scroll` listener on every page, calling `requestAnimationFrame` and writing to `sessionStorage`. | Continuous main-thread event handling and storage writes during normal user scrolling. | **P1** | Throttle/debounce scroll position saves, or rely on native browser scroll restoration. |
| **API & Network** | `MembersPage.tsx` fires 7 separate network requests in parallel on mount without backend aggregation. | High network concurrency, redundant fetching of all receipts and member vehicles. | **P1** | Combine or defer non-critical queries; avoid fetching all receipts merely to check member status. |
| **Components** | `IncomeReportPage.tsx` recalculates 4 distinct arrays (`fiscalYears`, `branches`, `users`, `feeHeads`) with `Set`, `map`, and `sort` on every render. | CPU thrashing during pagination, filtering, or column toggling on large report datasets. | **P2** | Wrap options derivation in `useMemo` dependent only on `rows`. |
| **Components & Tables** | `MembershipHistory.tsx` filters and sorts the entire receipts database without `useMemo` or `React.memo`. | Re-evaluates entire receipt history sorting on every keystroke inside the parent `BillingWorkspace`. | **P2** | Memoize `MembershipHistory` with `React.memo` and wrap `history` derivation in `useMemo`. |
| **Dependencies** | Obsolete & unused dependencies in `package.json`: `html-to-image`, `next-auth`, `regenerator-runtime`. | Increases node_modules size, security audit surface, and bundle confusion. | **P2** | Remove unused packages and remove `regenerator-runtime/runtime` import. |
| **Rendering** | Top-level Next.js page components (`app/(dashboard)/dashboard/*/page.tsx`) marked `'use client'` unnecessarily. | Prevents React Server Component optimization at route boundaries. | **P2** | Convert route pages to Server Components that render client feature containers. |
| **Accessibility** | Window-level custom event `billing-new-header-visibility-change` used for cross-component header toggling. | Brittle cross-window coupling, bypasses React component tree and context patterns. | **P3** | Manage header visibility via layout context or route matching rather than global DOM events. |
| **Consistency** | Typo in filename: `features/billing/components/create-bill/BIllingItemRow.tsx` (capital 'I'). | Inconsistent casing causes subtle cross-platform git/filesystem issues between Windows and Linux CI. | **P3** | Rename to `BillingItemRow.tsx` with consistent casing. |

---

## 2. Detailed Findings by Area

### 2.1 API Communication & Network Efficiency

#### Finding API-01 (P0): Per-Request `https.Agent` Allocation in Proxy Route
- **File:** `app/backend-api/[...path]/route.ts` (lines 60–63)
- **Problem:**
  ```typescript
  agent: new https.Agent({ rejectUnauthorized: !allowSelfSignedCertificates })
  ```
  A new `https.Agent` is instantiated inside `proxyRequest` for every incoming request.
- **Root Cause:** Ephemeral agent construction inside the request handler.
- **Impact:** Defeats HTTP Keep-Alive, TCP socket reuse, and TLS session resumption. Every proxied call incurs a full TLS handshake (adding 50–200ms latency) and causes socket exhaustion under high concurrency.
- **Proposed Solution:** Move `https.Agent` initialization outside `proxyRequest` to module scope with `keepAlive: true`, `maxSockets: 50`, and `maxFreeSockets: 10`.

#### Finding API-02 (P1): Sequential Waterfall in `fetchReceipts`
- **File:** `features/receipts/api/bill-resource.api.ts` (lines 379–409)
- **Problem:**
  `fetchReceipts` makes an imperative API call to `fetchFiscalYearManagement()` sequentially after fetching receipts, ignoring whether fiscal years are already cached in TanStack React Query.
- **Root Cause:** Lack of query cache sharing between independent API functions.
- **Impact:** Duplicate network requests for fiscal years whenever receipts are refetched or reloaded after receipt cancellation/correction.
- **Proposed Solution:** Allow passing fiscal year mappings or read from React Query cache before triggering an external network fetch.

---

### 2.2 Security & Authentication Lifecycle

#### Finding SEC-01 (P0): Unhandled 401 Unauthorized Session Invalidation
- **File:** `lib/api/request.ts` (lines 16–36) & `lib/authentication/authenticated-fetch.ts`
- **Problem:**
  When backend responds with HTTP 401 Unauthorized (e.g. token expired, revoked, or invalid credentials), `apiRequest` simply throws `new Error('Request failed (401)...')`.
- **Root Cause:** No response interceptor for authentication status codes.
- **Impact:** Token remains in `localStorage`. The application stays in `isAuthenticated: true` state. User clicks fail with cryptic error messages, and the app never automatically redirects to `/login`.
- **Proposed Solution:** In `apiRequest` or `authenticatedFetch`, if `response.status === 401`, remove `billing_access_token` from storage and dispatch an `auth:unauthorized` event to reset `AuthState` and trigger redirect to `/login`.

#### Finding SEC-02 (P2): Client-Side-Only Route Protection Flash
- **File:** `app/(dashboard)/dashboard/layout.tsx` (lines 129–137)
- **Problem:**
  Route authentication is checked only inside a client-side `useEffect`. Unauthenticated visitors initially download the dashboard layout and see a loading spinner before being redirected to `/login`.
- **Root Cause:** Lack of Next.js Edge/Node middleware to intercept protected dashboard paths.
- **Impact:** Minor layout flash, delayed navigation to login, and rendering of client bundles for unauthenticated requests.
- **Proposed Solution:** Implement Next.js `middleware.ts` to inspect auth cookie/session token on protected `/dashboard/:path*` routes and perform immediate HTTP 307 redirects.

---

### 2.3 State Management & React Rendering

#### Finding STATE-01 (P1): Redundant Jotai Atom Synchronization
- **Files:**
  - `features/billing-rules/hooks/useBillingRules.ts` (lines 16, 23–25, 34, 44)
  - `features/billing-rules/store/atom.ts`
  - `features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes.ts` (line 15)
  - `features/vehicle/type/hooks/useVehicleTypes.ts` (line 20)
  - `features/vehicle/store/vehicle-type-atoms.ts`
  - `features/members/components/MembersPage.tsx` (lines 68–71)
- **Problem:**
  React Query queries data, and then an effect writes to a Jotai atom:
  ```typescript
  const setBillingRuleResponse = useSetAtom(billingRuleResponseAtom);
  useEffect(() => {
    if (query.data) setBillingRuleResponse(query.data);
  }, [query.data, setBillingRuleResponse]);
  ```
  `billingRuleResponseAtom` is never even read by any component in the application!
  In `MembersPage.tsx`, both the query hook and the atom are accessed simultaneously:
  ```typescript
  const billingVehicleTypesQuery = useVehicleTypes();
  const billingVehicleTypes = useAtomValue(billingVehicleTypesAtom);
  ```
- **Root Cause:** Incomplete migration or architectural indecision between React Query and Jotai.
- **Impact:** Duplicate state stores, extra render passes, potential race conditions if atoms are read before effects run.
- **Proposed Solution:** Standardize on TanStack React Query for all server state. Deprecate and remove redundant Jotai atoms.

---

### 2.4 Component Architecture & Form Performance

#### Finding COMP-01 (P1): Monolithic Unmemoized Rerenders in `BillingWorkspace.tsx`
- **File:** `features/billing/components/create-bill/BillingWorkspace.tsx` (536 lines)
- **Problem:**
  `BillingWorkspace` manages all bill state (inputs, selected vehicle, manual items, overrides, discount, months, details, duplicates). None of its 8 major child components are wrapped in `React.memo`:
  - `BillingHeader`
  - `VehicleBilling`
  - `BillingItems`
  - `PaymentSection`
  - `VehicleSummary`
  - `MembershipHistory`
  - `VehicleCategoryMappingGate`
  - `DuplicateBillWarningDialog`
- **Root Cause:** Monolithic state colocation without memoization boundaries.
- **Impact:** Every keystroke in manual amount, discount input, or checkbox toggle triggers a complete re-render of all 8 components, recalculating duplicate matching, sorting, and vehicle summaries.
- **Proposed Solution:**
  1. Wrap child components in `React.memo`.
  2. Stabilize callback handlers with `useCallback`.
  3. Colocate local input states (e.g. search fields, draft overrides).

#### Finding COMP-02 (P2): Unmemoized Matrix Calculations in Reports
- **File:** `features/reports/components/IncomeReportPage.tsx` (lines 87–90) & `FeeHeadWiseReportPage.tsx`
- **Problem:**
  In `IncomeReportPage.tsx`:
  ```typescript
  const fiscalYears = Array.from(new Set(rows.map((row) => row.fiscalYear).filter(Boolean))).sort();
  const branches = Array.from(new Set(rows.map((row) => row.branchName).filter(Boolean))).sort();
  const users = Array.from(new Set(rows.map((row) => row.userName).filter(Boolean))).sort();
  const feeHeads = Array.from(new Map(rows...
  ```
  These 4 full array mappings and set transformations run on every single render.
- **Root Cause:** Missing `useMemo` wrapper on derived filter option lists.
- **Impact:** Wasteful CPU cycles and memory allocations whenever pagination changes, modals open, or columns toggle.
- **Proposed Solution:** Wrap derived option lists in `useMemo(() => ..., [rows])`.

---

### 2.5 Bundle Size & Code Splitting

#### Finding BUNDLE-01 (P1): Universal Import of 350KB Translation Dictionary
- **File:** `utils/translations.ts` (5,599 lines, 350,567 bytes)
- **Problem:**
  `utils/translations.ts` contains the massive full dictionary for both Nepali and English as a static exported constant `translations`. Because `useTranslations()` is exported from this file, nearly every component in the project imports it directly.
- **Root Cause:** Exporting both the hook and the monolithic dictionary from the same source file without code-splitting.
- **Impact:** Common vendor/shared chunks are bloated by ~350KB of unminified dictionary data on initial bundle load.
- **Proposed Solution:** Split the dictionary into language-specific JSON modules or dynamically load dictionary namespaces.

#### Finding BUNDLE-02 (P1): Static Import of `pdf-lib` in `TqmsMemberRegistryPage.tsx`
- **File:** `features/vehicle/tqms/components/TqmsMemberRegistryPage.tsx` (lines 5–6)
- **Problem:**
  ```typescript
  import fontkit from '@pdf-lib/fontkit';
  import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
  ```
- **Root Cause:** Top-level static import of a utility used only in an export button click handler (`downloadUniqueVehicleNumbersPdf`).
- **Impact:** Increases route bundle size by 300KB+ for all users opening the registry page, even if they never export a PDF.
- **Proposed Solution:** Convert to dynamic `await import('pdf-lib')` and `await import('@pdf-lib/fontkit')` inside `downloadUniqueVehicleNumbersPdf`.

#### Finding BUNDLE-03 (P2): Unused Packages in `package.json`
- **File:** `package.json`
- **Problem:**
  - `"html-to-image": "^1.11.13"` is never imported in the codebase.
  - `"next-auth": "^4.24.15"` is never imported in the codebase.
  - `"regenerator-runtime": "^0.14.1"` is only imported once in `TqmsMemberRegistryPage.tsx`.
- **Root Cause:** Residual dependencies left over from earlier prototypes.
- **Impact:** Unnecessary node_modules footprint, dependency vulnerability scan noise, potential accidental imports.
- **Proposed Solution:** Remove `html-to-image` and `next-auth` from `package.json`; remove `regenerator-runtime` import.

---

### 2.6 Layout, Navigation & Accessibility

#### Finding LAYOUT-01 (P1): Route Remounting & Unthrottled Scroll Tracking
- **File:** `app/(dashboard)/dashboard/layout.tsx` (lines 89–127, 176–187)
- **Problem:**
  1. `<motion.main key={pathname}>` inside `<AnimatePresence mode="wait">` unmounts and remounts the entire main container on every route change.
  2. Unthrottled scroll event listener attached on every page saves to `sessionStorage` on every animation frame.
- **Root Cause:** Attempting to force manual scroll restoration and cross-page exit animations via Framer Motion.
- **Impact:** Destroys component DOM state across tabs, triggers layout recalculations, and runs continuous RAF callbacks during user scrolling.
- **Proposed Solution:** Remove `key={pathname}` remounting from `DashboardRouteLayout`; streamline page transitions to CSS-based opacity transitions. Rely on standard Next.js scroll restoration or throttle scroll persistence.

