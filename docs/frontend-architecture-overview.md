# Frontend Architecture Overview: Billing Management System

**Document Version:** 1.0.0  
**Date:** 2026-10-31  
**Project:** Billing Management System (Current deployment: Narayani Sangh; architecture multi-organization capable)  
**Author:** Senior Frontend Architect & Performance Engineering  

---

## 1. Executive Summary

The Billing Management System is an enterprise-grade administrative and financial portal built with **Next.js 16.3.4 (App Router)** and **React 19.2.8** running on **Turbopack**. The system handles recurring and one-time membership billing, general billing, billing rule configuration, vehicle management integrated with TQMS, receipt issuance/printing, and regulatory/financial reporting.

The frontend is completely decoupled from the Rust-based REST backend and interacts with backend services through a dedicated Next.js API proxy (`/backend-api/[...path]`).

---

## 2. Technology Stack & Runtime Environment

| Layer | Technology | Details / Version |
|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.4` with Turbopack bundler |
| **UI Library** | React & React DOM | `19.2.8` |
| **Language** | TypeScript | `5.x`, strict mode enabled, custom path alias `@/*` |
| **Styling** | Tailwind CSS | `v4` (`@tailwindcss/postcss: ^4`, `tailwindcss: ^4`) |
| **Design System** | Radix UI Primitives | Dialog, Dropdown, Tabs, Tooltip, Select, Popover, Collapsible, Avatar |
| **Icons & Animation**| Lucide React & Framer Motion | `lucide-react: ^1.42.0`, `framer-motion: ^13.2.0` |
| **State Management**| Dual Architecture | `@tanstack/react-query: ^5.104.1` (server state) + `jotai: ^3.0.1` (atoms) |
| **Forms & Validation**| React Hook Form & Zod | `react-hook-form: ^7.89.0`, `zod: ^4.5.4` |
| **Document / PDF** | PDF-Lib & jsPDF | `pdf-lib: ^1.17.1`, `@pdf-lib/fontkit: ^1.1.1`, `jspdf: ^4.2.1` |
| **Localization** | Custom Devanagari Engine | `@nepalibhasha/converter`, `@fontsource/noto-sans-devanagari` |
| **Testing** | Node.js Test Runner | `node:test` + `jiti/register` (91 unit/integration tests) |

---

## 3. Directory & Module Architecture

The repository follows a feature-driven modular structure:

```
frontend/
├── app/                                # Next.js App Router root
│   ├── (auth)/                         # Unauthenticated routes
│   │   └── login/                      # Login page
│   ├── (dashboard)/                    # Main organization portal
│   │   └── dashboard/                  # Dashboard routes (billing, receipts, reports, etc.)
│   ├── (platform)/                     # Multi-tenant platform management routes
│   │   └── platform/                   # Organizations, plans, integrations, audit
│   ├── backend-api/[...path]/          # Node.js HTTPS reverse proxy to Rust backend
│   ├── layout.tsx                      # Root HTML layout & global providers
│   └── page.tsx                        # Root redirect to /login
├── components/                         # Shared application primitives
│   ├── common/                         # Navigation, breadcrumbs, search, dates, spinners
│   ├── data-tables/                    # Reusable table headers, pagination, skeleton
│   ├── feedback/                       # Error states, empty states
│   └── ui/                             # Radix + Tailwind base components (shadcn/ui)
├── constants/                          # System configurations, default branding, navigation
├── contexts/                           # React Context providers (Auth, Organization, Fontasy)
├── features/                           # Domain-specific feature modules
│   ├── administration/                 # Billing entities, branches, users
│   ├── auth/                           # Login forms, token storage, auth API client
│   ├── billing/                        # Bill creation, vehicle search, validation, calculations
│   ├── billing-rules/                  # Fee heads, rules, fiscal years, configuration
│   ├── members/                        # Member lists, calculation, status
│   ├── receipts/                       # Receipts table, filtering, correction, cancellation, PDF
│   ├── reports/                        # Daily income, fee-head, vehicle-wise, Mahasangh
│   ├── settings/                       # Cancellation window, linked rules, fiscal year selector
│   └── vehicle/                        # TQMS registry, blacklist, vehicle types, compliance
├── lib/                                # Core shared infrastructure
│   ├── api/                            # HTTP client, request wrapper, endpoints, errors
│   ├── authentication/                 # Authenticated fetch wrapper
│   └── query/                          # QueryClient factory, query key factory
├── provider/                           # Provider tree composition (`app-providers.tsx`)
├── public/                             # Static assets, logos, Devanagari TTF fonts
├── shared/                             # Cross-boundary domain engines (Document generation)
├── tests/                              # Node.js automated test suites
├── types/                              # Core TypeScript definitions (auth, etc.)
└── utils/                              # Formatting, dates, numbers, translations
```

---

## 4. Routing & Layout Architecture

1. **Root Layout (`app/layout.tsx`)**:
   - Injects Noto Sans Devanagari stylesheet (`@fontsource/noto-sans-devanagari`).
   - Configures `lang="ne"`, `translate="no"`, and metadata.
   - Wraps children in `<Providers>`:
     `OrganizationProvider` -> `JotaiProvider` -> `ThemeProvider` -> `FontasyHimaliProvider` -> `QueryClientProvider` -> `AuthProvider`.
2. **Dashboard Layout (`app/(dashboard)/dashboard/layout.tsx`)**:
   - Implements `SidebarProvider`, `SidebarNav`, and `DashboardHeader`.
   - Uses `Framer Motion` (`AnimatePresence` and `motion.main` with `key={pathname}`) to animate route transitions.
   - Monitors scroll position via unthrottled `window.addEventListener('scroll')` to save and restore per-route scroll positions in `sessionStorage`.
   - Protects routes client-side: evaluates `authReady`, `isLoading`, `isAuthenticated`, and `canAccessDashboardPath`. Redirects to `/login` or `/dashboard` via `router.replace`.

---

## 5. API & Network Communication Layer

1. **Proxy Architecture (`app/backend-api/[...path]/route.ts`)**:
   - Browser requests make relative calls to `/backend-api/...`.
   - The Next.js Node.js server route proxies requests to upstream `API_PROXY_TARGET` using `node:https`.
   - **Architectural Bottleneck**: An instance of `new https.Agent(...)` is currently created on every proxied request, preventing TCP connection pooling and keep-alive socket reuse.
2. **Client Request Pipeline**:
   - `lib/api/client.ts` -> `lib/api/request.ts` -> `lib/authentication/authenticated-fetch.ts` -> `/backend-api/...` -> Rust backend.
   - Injects JWT access token from browser `localStorage` (`billing_access_token`).
3. **Data Fetching Strategy**:
   - React Query (`@tanstack/react-query`) manages server queries and mutations.
   - Global default `staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`.
   - Mutations have `retry: false` to protect financial transaction safety.

---

## 6. Authentication & Authorization Lifecycle

1. **Credentials Login**:
   - Submits email/password to `/backend-api/auth/login`.
   - Backend returns JWT token containing claims: `sub`, `email`, `role`, `exp`.
   - Token is stored in `localStorage` under `billing_access_token`.
2. **Client-Side Identity Verification**:
   - On page mount, `auth-context.ts` parses the JWT base64 payload to extract user details and verify expiration (`claims.exp * 1000 > Date.now()`).
3. **Authorization**:
   - Role-based permissions (`ADMIN`, `OPERATOR`, `USER`) are evaluated in `canAccessDashboardPath` for navigation visibility.
   - **Risk**: 401 Unauthorized responses currently do not clear tokens or trigger auto-logout, leaving stale client session states.

---

## 7. Financial & Billing Domain Logic

1. **Billing Rule Configuration**:
   - Dynamic JSON-based `BillingRuleResource` storing rules, fee heads, and fiscal years in a unified document structure.
   - Scopes: `COMMON` (applies to all vehicles) and `VEHICLE_TYPE` (applies to mapped vehicle category).
2. **Bill Creation Workflow**:
   - Vehicle lookup via TQMS integration with branch-level filtering and blacklist verification.
   - Automated rule matching, periodic vs one-time fee calculation, and duplicate bill verification (`findDuplicateBillItems`).
   - Line items validated via standalone pure utility `bill-validation.ts`.
3. **Receipt Lifecycle**:
   - Unique receipt numbering: `{BRANCH_CODE}.{RECEIPT_ID} ({FISCAL_YEAR_NEPALI})`.
   - Printing and copy tracking recorded in resource audit history.
   - Correction preserves vehicle number and owner name as strictly immutable.
   - Time-bound cancellation window enforced by organization policy.
4. **Document & PDF Output**:
   - High-fidelity binary PDF generation via `pdf-lib` and `@pdf-lib/fontkit` embedding Noto Sans Devanagari and Fontasy Himali TTF fonts.
   - Strict layout rules: no horizontal borders between item rows, bold total row borders, formal signature hierarchy.

---

## 8. Current System Strengths & Identified Risks

### Strengths
- High domain cohesion: Features are well compartmentalized by business capability.
- Solid test coverage: 91 deterministic tests covering core business, receipts, PDF, and resilience logic.
- Type safety: Strict TypeScript configurations and Zod schemas across endpoints.
- Authentic Nepali localization: Native Bikram Sambat date conversion and Devanagari numeral handling.

### Key Risks & Bottlenecks
- **Dual state overlap**: Jotai atoms mirror React Query server state with unread atoms and redundant `useEffect` syncs.
- **Client-side data overload**: Complete receipt histories are fetched into client memory for reports and member status calculations without pagination.
- **Next.js Proxy socket overhead**: Ephemeral `https.Agent` on every request impairs backend throughput.
- **Bundle overhead**: Static 350KB translation dictionary imported universally across client components; static imports of heavy PDF libraries in page routes.
- **Unthrottled scroll and transition animations**: Layout remounts on every navigation and attaches unthrottled scroll listeners.

