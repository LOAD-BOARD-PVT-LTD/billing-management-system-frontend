# Organization theme configuration

The frontend resolves the active organization through `OrganizationProvider` and
applies its visual preferences in `ThemeProvider`. Theme values are presentation
configuration only; they must not be used for authorization, billing rules, or
other business decisions.

`organizationThemeDefaults` in `constants/organization.ts` is the canonical
default organization palette. The default palette is muted blue (`#315D78`),
slate (`#64748B`), and teal (`#0F766E`). The stylesheet's semantic token values
provide the pre-hydration and non-provider fallbacks and are kept aligned with
that palette.

`OrganizationConfig` supports:

| Property | Format | Fallback |
| --- | --- | --- |
| `organizationId` | Organization identifier | `null` when no organization is active |
| `nameNepali`, `nameEnglish` | Non-empty strings | Application organization defaults; generic names for an unknown organization |
| `logoUrl` | Same-origin absolute path or HTTPS URL | No logo |
| `primaryColor`, `secondaryColor`, `accentColor` | `#RGB` or `#RRGGBB` | `#315D78`, `#64748B`, `#0F766E` |
| `themeMode` | `light`, `dark`, or `system` | `light` |
| `borderRadius` | `compact`, `comfortable`, or `rounded` | `comfortable` |
| `currencySymbol` | Non-empty string | Application default |

Invalid color and logo values are discarded. On organization changes, the theme
provider removes the previous organization's inline token overrides before
applying the next configuration. The dark theme follows the operating-system
preference only when `themeMode` is `system`.
The accent color is mapped to success indicators and to a lightly tinted
semantic accent surface, keeping full-strength teal reserved for meaningful
status and progress UI.

The root layout currently initializes the default organization, and the
repository does not define an organization-theme API or persistence contract.
Callers that already know the active organization can pass its configuration to
`Providers`; client-side organization switching can call
`setActiveOrganization(organizationId, configuration)` from `useOrganization`.
When backend persistence is added, return the above presentation properties
within the authenticated, organization-scoped organization response. The
backend should enforce the caller's organization access; the frontend must not
use theme values as proof of tenant membership.
