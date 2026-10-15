# Implementation: Customer & Admin Layouts

## Overview

This document records the implementation of the Customer (User) Layout and Admin Layout for the Hotel & Bus Booking System Angular frontend.

Authentication was already fully integrated prior to this phase (cookie-based, HttpOnly `access_token`, `/auth/me` session restoration, `AuthService` signals, guards).

---

## Files Created

### Customer Layout

| File | Description |
|---|---|
| `src/app/layout/user-layout/user-layout.ts` | Shell component with `UserHeader` and `RouterOutlet` |
| `src/app/layout/user-layout/user-header/user-header.ts` | Responsive navigation for authenticated users |
| `src/app/layout/user-layout/user-header/user-header.html` | Header template with auth-aware controls |
| `src/app/layout/user-layout/user-header/user-header.css` | Styling consistent with the existing design system |

### Admin Layout

| File | Description |
|---|---|
| `src/app/layout/admin-layout/admin-layout.ts` | Admin shell with sidebar, topbar, logout |
| `src/app/layout/admin-layout/admin-layout.html` | Template with sidebar nav, overlay, topbar, content area |
| `src/app/layout/admin-layout/admin-layout.css` | Full-width sidebar + responsive mobile behavior |
| `src/app/layout/admin-layout/admin-dashboard/admin-dashboard.ts` | Minimal dashboard placeholder |

---

## Files Modified

| File | Change |
|---|---|
| `src/app/app.routes.ts` | Added `UserLayout` and `AdminLayout` routes with correct guards |
| `src/app/layout/user-layout/BusBookings/BusBookings.component.ts` | Converted to `standalone: true` for lazy loading |

---

## Routing Structure

```
/ (PublicLayout)
└── ''              → Landing Page

/login              → LoginComponent   [guestGuard]
/register           → RegisterComponent [guestGuard]

/user               → UserLayout       [authGuard + roleGuard(['USER'])]
└── bus-bookings    → BusBookingsComponent
└── ''              → redirectTo: bus-bookings

/admin              → AdminLayout      [authGuard + roleGuard(['ADMIN'])]
└── ''              → AdminDashboard

** → redirectTo: ''
```

---

## Authentication & Guards — Reused Unchanged

- `AuthService` — signals, `/auth/me`, `ensureInitialized()`
- `authGuard` — awaits initialization, redirects to `/login?returnUrl=...`
- `roleGuard` — parameterized, uses exact backend role values (`ADMIN` | `USER`)
- `guestGuard` — redirects authenticated users from login/register
- `authInterceptor` — global `withCredentials: true`
- No token stored in browser storage. No changes to cookie handling.

---

## Customer Layout

- Fixed header with TravelEase branding
- Navigation links to `/` (Home) and `/user/bus-bookings`
- Theme toggle (reuses `ThemeService`)
- Auth-aware: shows user greeting + Sign Out when authenticated; Login/Register otherwise
- Responsive: hamburger menu at ≤900px, mobile dropdown nav
- `RouterOutlet` renders child pages

## Admin Layout

- Persistent sidebar (260px) with all 12 module navigation items
- Items: Dashboard, Hotels, Rooms, Users, Buses, Bus Seats, Bus Stops, Routes, Trips, Hotel Bookings, Bus Bookings, Payments
- Sidebar highlights active route via `routerLinkActive="active"`
- Sidebar footer shows user avatar (initial letter), name, role, and logout button
- Top bar with sidebar toggle, theme toggle, user avatar, and logout
- Sidebar collapses to overlay drawer on ≤1024px with backdrop
- `RouterOutlet` renders child admin pages

---

## Verification Performed

- [x] `ng build` — Application builds with zero errors
- [x] Public routes (`/`, `/login`, `/register`) remain in `PublicLayout` — unchanged
- [x] `USER` role → `UserLayout` at `/user` (authGuard + roleGuard(['USER']))
- [x] `ADMIN` role → `AdminLayout` at `/admin` (authGuard + roleGuard(['ADMIN']))
- [x] `ADMIN` attempting `/user` → redirected to `/admin` (via roleGuard)
- [x] `USER` attempting `/admin` → redirected to `/` (via roleGuard)
- [x] Unauthenticated attempting `/user` or `/admin` → redirected to `/login?returnUrl=...`
- [x] Logout navigates to `/` from both layouts
- [x] `BusBookingsComponent` converted to standalone — lazy loading works
- [x] Theme toggle works in both layouts
- [x] No changes to auth cookie handling, interceptor, or guards

---

## Pending Routes (Not Yet Implemented)

The sidebar references these admin routes which are not yet implemented:

- `/admin/hotels`
- `/admin/rooms`
- `/admin/users`
- `/admin/buses`
- `/admin/bus-seats`
- `/admin/bus-stops`
- `/admin/bus-routes`
- `/admin/bus-trips`
- `/admin/hotel-bookings`
- `/admin/bus-bookings`
- `/admin/payments`

Clicking these will trigger the wildcard redirect (`** → ''`) until implemented. They should be added as child routes under `/admin` in a future phase.

---

## Next Recommended Phase

**Phase 3: Admin Module CRUD Pages**

Implement the admin data management pages for each of the pending routes above. Each page should provide list, create, edit, and delete operations using the existing backend API and services.

Suggested order: Users → Hotels → Rooms → Buses → Bus Routes → Bus Stops → Bus Trips → Bus Seats → Hotel Bookings → Bus Bookings → Payments.

---

# Implementation: Hotel Listing with API Integration & Pagination

## Overview

This phase implements the public **Hotel Listing** feature, integrating with the real backend REST endpoints according to the provided API contracts, using the existing Spring Data pagination models and design tokens.

---

## Files Created

| File | Description |
|---|---|
| `src/app/features/hotels/hotel-listing/hotel-listing.ts` | Standalone component with Angular signals, reactive search debounce, filter state, pagination controls, and accessibility attributes |
| `src/app/features/hotels/hotel-listing/hotel-listing.html` | Template with 4 distinct states (Loading skeleton, Success grid, Empty state, Error retry), search/filter bar, and numeric pagination |
| `src/app/features/hotels/hotel-listing/hotel-listing.css` | Component styles implementing shimmer loading skeleton, responsive card grid, filter dropdowns, and pagination using design tokens |

---

## Files Modified

| File | Change |
|---|---|
| `src/app/core/services/hotel.service.ts` | Fully implemented all 6 API contract methods (`getHotels`, `lookupHotels`, `getHotelById`, `createHotel`, `updateHotel`, `deleteHotel`) with `HttpParams` and error handling |
| `src/app/app.routes.ts` | Registered public `/hotels` route under `PublicLayout` with lazy loading |
| `IMPLEMENTATION.md` | Updated with feature documentation, API contracts, and verification details |

---

## APIs Integrated

| Endpoint | Method | Purpose | Auth | Request Model / Params | Response Model |
|---|---|---|---|---|---|
| `/hotels` | GET | Hotel listing & filters | Public (None) | `page` (default 0), `size` (default 20), `sort`, `q`, `city`, `minRating`, `maxPrice` | `PageHotelDTO` |
| `/hotels/lookup` | GET | Search dropdown / autocomplete | Public (None) | `page` (default 0), `size` (default 20), `sort`, `q` | `PageHotelDTO` |
| `/hotels/{id}` | GET | Specific hotel details | Public (None) | Path parameter `id: number` | `HotelDTO` |
| `/hotels` | POST | Add hotel (Admin) | Admin | `HotelRequestDTO` | `HotelDTO` |
| `/hotels/{id}` | PUT | Edit hotel (Admin) | Admin | `HotelRequestDTO` | `HotelDTO` |
| `/hotels/{id}` | DELETE | Delete hotel (Admin) | Admin | Path parameter `id: number` | `HotelDTO` |

---

## Models Reused

- **`HotelDTO`** (`src/app/core/models/Hotel/hotel.model.ts`):
  `id`, `name`, `description`, `address`, `city`, `latitude`, `longtude`, `rating`, `checkInTime`, `checkOutTime`.
- **`HotelRequestDTO`** (`src/app/core/models/Hotel/hotel.model.ts`):
  `name`, `description`, `address`, `city`, `latitude`, `longitude`, `rating`, `checkInTime`, `checkOutTime`.
- **`PageHotelDTO`** (`src/app/core/models/Pagination/hotelPage.model.ts`):
  Spring Data Page envelope: `content: HotelDTO[]`, `totalElements: number`, `totalPages: number`, `number: number`, `size: number`, `numberOfElements: number`, `first: boolean`, `last: boolean`, `empty: boolean`, `pageable: Pageable`, `sort: Sort`.

---

## Pagination Behavior

1. **Zero-Based Page Index**: The backend Spring Data API uses 0-based indexing (`page=0` for the first page). The UI internally maintains 0-based signals and displays 1-based labels (`page + 1`) to end users.
2. **Dynamic Navigation**:
   - `Previous` and `Next` buttons disabled dynamically when `first: true` or `last: true`.
   - Window sliding page numbers displaying up to 5 adjacent pages centered around `currentPage`.
   - Clicking a page triggers `window.scrollTo({ top: 0, behavior: 'smooth' })`.
3. **Filter-Driven Page Reset**:
   - Typing in search input (debounced by 400ms with `distinctUntilChanged`).
   - Changing the city filter.
   - Changing minimum rating filter.
   - Changing sort ordering.
   - Each filter change resets `currentPage` to `0` automatically before dispatching the request.
4. **Resilient Count Metadata**:
   - Results counter calculates `displayedFrom` and `displayedTo` safely using `Math.min(pageNum * p.size + numberOfElements, totalElements)` with null-safety checks on `pageable`.

---

## Component States Implemented

1. **Loading State**: Displays 8 skeleton shimmer cards with animated pulse gradients, mimicking the card layout without UI flicker.
2. **Success State**: Renders responsive CSS grid of cards showing hotel name, city badge, star rating, address, description, check-in and check-out badges.
3. **Empty State**: Displays friendly graphic icon, context-aware message depending on whether search filters are active, and a one-click "Clear Filters" action.
4. **Error State**: Displays accessible alert with server error message and a "Try Again" retry button that re-executes `loadHotels()`.

---

## Routing Structure

```
/ (PublicLayout)
├── ''              → Landing Page
└── hotels          → HotelListing (Public, Lazy Loaded)

/login              → LoginComponent   [guestGuard]
/register           → RegisterComponent [guestGuard]

/user               → UserLayout       [authGuard + roleGuard(['USER'])]
└── bus-bookings    → BusBookingsComponent
└── ''              → redirectTo: bus-bookings

/admin              → AdminLayout      [authGuard + roleGuard(['ADMIN'])]
└── ''              → AdminDashboard

** → redirectTo: ''
```

---

## Verification Performed

- [x] Compilation and TypeScript check: Zero errors.
- [x] Standalone component contract: Correct `imports` (`FormsModule`, `RouterLink`, `DecimalPipe`).
- [x] Route registration: `/hotels` under `PublicLayout` accessible without authentication.
- [x] API contract verification: Correct endpoints, query parameters, and models without invented wrappers.
- [x] Design system consistency: CSS uses project design tokens (`--bg-surface`, `--color-primary`, `--radius-lg`, etc.).
- [x] Accessibility: ARIA roles, live regions (`aria-live="polite"` and `aria-live="assertive"`), semantic markup (`<article>`, `<section>`, `<nav>`).

---

## Outstanding Dependencies

- Real hotel records require the backend service (`http://localhost:8080/api/hotels`) to be running.
- When backend is offline or returns error status, the component gracefully enters the Error State with retry capabilities.

---

# Implementation: Admin Hotel Management (CRUD & PrimeNG Integration)

## Overview

This phase implements the **Hotel Management page inside the Admin Dashboard**, allowing authenticated administrators (`ADMIN` role) to browse, search, filter, create, edit, and delete hotel records using the existing `HotelService`, `HotelDTO`, `HotelRequestDTO`, and `PageHotelDTO` models.

The page utilizes PrimeNG components (`p-table`, `p-dialog`, `p-toast`, `p-tag`, `pInputText`, `pTextarea`, `p-inputNumber`, `p-progressSpinner`) styled to seamlessly harmonize with the project's design system tokens and Aura theme.

---

## Files Created

| File | Description |
|---|---|
| `src/app/layout/admin-layout/hotels-management/hotels-management.ts` | Standalone component with Angular signals, PrimeNG table integration, reactive forms, validation, and CRUD operations using `HotelService` |
| `src/app/layout/admin-layout/hotels-management/hotels-management.html` | Template with responsive table, search and filter toolbar, create/edit modal dialog, delete confirmation dialog, and toast notifications |
| `src/app/layout/admin-layout/hotels-management/hotels-management.css` | Custom styling harmonizing PrimeNG components with design tokens (`--bg-elevated`, `--color-primary`, `--border-color`, etc.) |

---

## Files Modified

| File | Change |
|---|---|
| `src/app/app.routes.ts` | Added lazy-loaded `/admin/hotels` child route under `admin` protected by `authGuard` and `roleGuard(['ADMIN'])` |
| `src/app/features/hotels/hotel-listing/hotel-listing.ts` | Removed unused `RouterLink` import to keep compiler warnings clean |
| `IMPLEMENTATION.md` | Appended documentation for Admin Hotel Management feature |

---

## Routing & Navigation

- **Sidebar Integration**: The sidebar item `{ label: 'Hotels', route: '/admin/hotels', icon: '🏨' }` in `AdminLayout` now routes directly to `HotelsManagement`.
- **Role-Based Authorization**: Protected by existing `authGuard` and `roleGuard(['ADMIN'])`. Unauthenticated users or non-admin users (`USER`) cannot access this route.
- **Route Definition**:
  ```ts
  {
    path: 'hotels',
    loadComponent: () =>
      import('./layout/admin-layout/hotels-management/hotels-management').then(m => m.HotelsManagement),
    title: 'TravelEase Admin — Hotels Management',
  }
  ```

---

## CRUD Operations & API Service Reuse

All operations strictly reuse `HotelService` without duplicating API calls:

1. **Read / List**:
   - `hotelService.getHotels({ page, size, sort, q, city, minRating })`
   - Server-side lazy pagination via `p-table` with 0-based page mapping.
   - Filter bar with search debounced by 400ms (`distinctUntilChanged`), city filter, rating threshold select, and sort options.
2. **Create**:
   - `hotelService.createHotel(payload: HotelRequestDTO)`
   - Modal form validating required fields (`name`, `city`, `address`, `checkInTime`, `checkOutTime`, `latitude`, `longitude`, `rating`).
   - Resets page to 0 and reloads dataset upon success.
   - Displays success notification via PrimeNG `Toast`.
3. **Update**:
   - `hotelService.updateHotel(id: number, payload: HotelRequestDTO)`
   - Prepopulates form with selected `HotelDTO` data (handling both `longitude` and `longtude` gracefully).
   - Preserves current page and refreshes dataset upon success.
4. **Delete**:
   - `hotelService.deleteHotel(id: number)`
   - Requires explicit confirmation via modal dialog showing the target hotel's name.
   - Boundary condition handled: if the deleted record was the sole item on the current page (and not page 0), automatically steps back to the previous page before reloading.

---

## Verification Performed

- [x] `ng build` — Succeeded with exit code 0 (`chunk-WHLYSASU.js [hotels-management]`).
- [x] Admin Sidebar link `/admin/hotels` opens `HotelsManagement` lazy-loaded.
- [x] Route protection: Inherits `authGuard` and `roleGuard(['ADMIN'])` from `/admin`.
- [x] Public Hotel Listing (`/hotels`) remains intact and accessible to guests.
- [x] PrimeNG components (`p-table`, `p-dialog`, `p-toast`, `p-tag`, inputs) match the application theme and responsive layouts.
- [x] Form validation checks all required fields and prevents duplicate submissions while requests are in flight.


