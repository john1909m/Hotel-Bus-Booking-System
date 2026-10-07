# Hotel & Bus Booking System — Angular Frontend Requirements

## 1. Overview
Build the frontend using **Angular + TypeScript**, Angular Router, HttpClient, Reactive Forms and RxJS. Integrate with the existing Spring Boot REST APIs.

The system has two roles:
- CUSTOMER
- ADMIN

Customer flow:
Hotel discovery → Hotel details → Room selection → Hotel booking → Optional bus recommendations → Optional seat selection → Booking summary → Confirmation → My bookings.

Admin manages hotels, rooms, users, buses, seats, bus stops, routes, trips, bookings and payments.

## 2. Important Rules
Before implementation:
1. Inspect the existing Angular project.
2. Inspect current components, routes, services and styles.
3. Inspect Swagger/backend API contracts.
4. Reuse existing code where practical.
5. Do not invent API endpoints when an existing endpoint provides the required operation.
6. Do not use fake/mock data in the final UI.
7. Do not move backend business logic into Angular.
8. Do not introduce unnecessary libraries or over-engineered architecture.

## 3. UI/UX Direction
Use a **MAXIMALIST TRAVEL-TECH** visual style:
- Bold and colorful
- Premium and energetic
- Large typography
- Gradients
- Rich photography
- Layered/floating cards
- Decorative shapes
- Strong shadows
- Bold CTA buttons
- Asymmetric/editorial layouts
- Micro-interactions and smooth transitions

It must remain professional, readable and usable. Avoid generic Bootstrap-looking pages and excessive empty space.

## 4. Suggested Angular Structure
Adapt to the existing project instead of forcing a restructure:

```text
src/app/
├── core/
│   ├── guards/
│   ├── interceptors/
│   ├── services/
│   └── models/
├── shared/
│   ├── components/
│   ├── pipes/
│   └── models/
├── features/
│   ├── auth/
│   ├── customer/
│   └── admin/
├── layout/
│   ├── customer-layout/
│   └── admin-layout/
├── app.routes.ts
└── app.config.ts
```

## 5. Authentication
Implement:
- Register
- Login
- Logout
- Authentication state
- Role detection
- Protected routes

Registration fields:
- Name
- Email
- Phone
- Password
- Confirm password

Login:
- Email
- Password

After login:
- CUSTOMER → customer dashboard/home
- ADMIN → admin dashboard

Use an HTTP interceptor for JWT/token authentication if required by the backend.

## 6. Route Guards
Create:
- Authentication guard
- Admin/role guard
- Customer/role guard

Suggested separation:

```text
/auth/login
/auth/register
/customer/...
/admin/...
```

Frontend guards are for navigation/UX; backend authorization remains the real security layer.

## 7. API Services
Use Angular services and HttpClient. Suggested services:

```text
AuthService
UserService
HotelService
RoomService
HotelBookingService
BusService
BusSeatService
BusStopService
BusRouteService
BusTripService
BusBookingService
BookingService
PaymentService
```

Adapt names to actual APIs.

Components should not contain large API implementations. Handle:
- Loading
- Success
- Empty results
- Validation errors
- 401/403/404/409/500
- Server errors

Never display raw Spring stack traces.

## 8. Customer Pages

### Landing Page `/`
Include:
- Navbar
- Hero
- Hotel search
- Featured hotels
- How it works
- Transportation explanation
- CTA
- Footer

Hero concept:
**“Your Stay. Your Journey. One Booking.”**

Visually communicate:
`Hotel → Nearby Bus Stop → Bus Trip`

### Hotel Listing `/hotels`
Include:
- Search
- Location
- Check-in/check-out
- Guests
- Filters
- Sorting
- Hotel cards

Hotel card:
- Image
- Name
- Location
- Rating
- Starting price
- Availability
- Amenities
- View Details

### Hotel Details `/hotels/:id`
Include:
- Image gallery
- Name
- Location
- Rating
- Description
- Amenities
- Available rooms
- Room cards
- Nearby transportation

Visual relationship:
`Hotel → Nearby Bus Stop → Route → Bus Trips`

### Hotel Booking Flow
Use a visual stepper:

```text
01 Hotel → 02 Room → 03 Dates → 04 Transportation → 05 Summary → 06 Confirmation
```

### Bus Recommendations
Show backend-provided suitable trips based on:
- Hotel location
- Nearby stops
- Check-in/check-out
- Departure/arrival
- Availability

Title:
**“Trips that fit your stay”**

Clearly separate:
- Outgoing trip: must arrive before hotel check-in with suitable buffer.
- Return trip: must depart after hotel check-out with suitable buffer.

Each trip card:
- Bus
- Route
- Departure
- Arrival
- Stop
- Duration
- Available seats
- Price
- Select Trip

### Transportation Is Optional
Allow:
- Hotel only
- Hotel + outgoing bus
- Hotel + return bus
- Hotel + both buses

### Bus Seat Selection
Interactive bus layout with:
- Available
- Selected
- Occupied
- Disabled

Show selected seats and total price. Use actual backend availability.

### Booking Summary
Show:
- Hotel
- Room
- Dates
- Guests
- Outgoing bus if selected
- Return bus if selected
- Seats
- Individual prices
- Total
- Confirm button

### Confirmation
Create a strong success screen:
- Booking reference
- Hotel
- Room
- Dates
- Bus details
- Seats
- Total
- Status

## 9. Customer Dashboard `/customer/dashboard`
Travel-oriented dashboard with:
- Upcoming hotel booking
- Upcoming bus trip
- Recent bookings
- Booking status
- Quick actions

Use real backend data only.

## 10. Customer Bookings
`/customer/bookings`
- Hotel bookings
- Bus bookings
- Combined bookings
- Booking reference
- Date
- Hotel
- Bus
- Status
- Total
- View Details

`/customer/bookings/:id`
Show complete hotel, room, dates, bus, route, stops, seats, payment and status information.

## 11. Customer Profile
`/customer/profile`
- Name
- Email
- Phone
- Account information
- Edit where backend supports it

## 12. Admin Layout
Dedicated admin sidebar:

```text
Dashboard
Hotels
Rooms
Users
Buses
Bus Seats
Bus Stops
Routes
Trips
Hotel Bookings
Bus Bookings
Payments
Logout
```

Keep the maximalist visual language but make it data-heavy and powerful.

## 13. Admin Dashboard `/admin/dashboard`
Show real backend statistics where supported:
- Users
- Hotels
- Rooms
- Buses
- Trips
- Hotel bookings
- Bus bookings
- Revenue
- Payments

Include:
- Charts
- Recent bookings
- Popular hotels
- Popular routes
- Booking status distribution

Do not invent statistics.

## 14. Admin CRUD Pages
Create management interfaces for:

### Hotels `/admin/hotels`
Search, filter, create, edit, delete, details.

### Rooms `/admin/rooms`
Hotel, room type, capacity, price, status.

### Users `/admin/users`
Name, email, phone, role, status.

### Buses `/admin/buses`
Bus details and seat count.

### Bus Seats `/admin/bus-seats`
Seat number, type, bus, status.

### Bus Stops `/admin/bus-stops`
Stop name and location.

### Routes `/admin/routes`
Route information and ordered bus stops.

### Trips `/admin/trips`
Bus, route, departure, arrival, status and availability.

### Hotel Bookings `/admin/hotel-bookings`
Customer, hotel, room, check-in/out, status, price.

### Bus Bookings `/admin/bus-bookings`
Customer, trip, route, seat, date, status, price.

### Payments `/admin/payments`
Booking, customer, amount, method, status and date.

Use tables/cards, filters, forms, modals and confirmation dialogs.

## 15. Reusable Components
Create reusable components only when genuinely repeated:

```text
HotelCard
RoomCard
BusTripCard
BookingCard
StatusBadge
SearchBar
FilterPanel
DataTable
Modal
ConfirmDialog
LoadingState
EmptyState
ErrorState
Stepper
SeatSelector
Pagination
```

## 16. Forms
Use Angular Reactive Forms.

Support:
- Required validation
- Email validation
- Password validation
- Number validation
- Date validation
- Cross-field validation where needed

Show clear validation messages and prevent double submission.

## 17. Loading / Empty / Error States
Every API-driven screen needs appropriate states.

Examples:
- Skeleton/loading
- No hotels found
- No bookings yet
- No suitable bus trips
- No available rooms
- API error
- Validation error

Use designed UI states instead of browser alerts.

## 18. Responsive Design
Support:
- Desktop
- Laptop
- Tablet
- Mobile

Do not simply shrink desktop designs. Create proper responsive layouts for:
- Navigation
- Sidebar
- Cards
- Booking forms
- Seat selection
- Tables
- Dashboards
- Modals

## 19. Business Rules
Frontend must respect backend rules.

### Hotel availability
Availability is based on booking/date conflicts, not a permanent boolean.

### Bus availability
Seat availability belongs to a specific bus trip, not globally to the physical bus.

### Relationship
```text
Hotel
 ↓
HotelBusStop
 ↓
BusStop
 ↓
BusRoute
 ↓
BusTrip
```

### Transportation
Optional.

### Outgoing
Should fit before check-in.

### Return
Should fit after check-out.

Backend performs final validation.

## 20. Suggested Routes

```text
/
/hotels
/hotels/:id

/auth/login
/auth/register

/customer/dashboard
/customer/bookings
/customer/bookings/:id
/customer/profile
/customer/booking/...

/admin/dashboard
/admin/hotels
/admin/rooms
/admin/users
/admin/buses
/admin/bus-seats
/admin/bus-stops
/admin/routes
/admin/trips
/admin/hotel-bookings
/admin/bus-bookings
/admin/payments
```

## 21. UX Flow

```text
Landing
 ↓
Search Hotels
 ↓
Hotel Results
 ↓
Hotel Details
 ↓
Select Room
 ↓
Select Dates
 ↓
Hotel Booking
 ↓
Bus Recommendations
 ↓
Optional Bus Selection
 ↓
Seat Selection
 ↓
Booking Summary
 ↓
Confirmation
 ↓
Customer Dashboard
```

The customer can finish after hotel booking without selecting transportation.

## 22. Design System
Create consistent:
- Colors
- Typography
- Buttons
- Inputs
- Cards
- Modals
- Tables
- Badges
- Alerts
- Spacing
- Shadows
- Border radius
- Icons
- Focus states

Use the same design language across authentication, customer, admin and booking screens.

## 23. Accessibility
Maintain:
- Semantic HTML
- Accessible labels
- Keyboard navigation
- Sufficient contrast
- Visible focus states
- Alt text
- Accessible modals
- Clear errors

## 24. Implementation Order

1. Inspect existing Angular project.
2. Inspect Swagger/backend APIs.
3. Establish global design system.
4. Authentication.
5. Route guards.
6. Customer/Admin layouts.
7. Hotel listing.
8. Hotel details.
9. Room selection.
10. Hotel booking.
11. Bus recommendations.
12. Bus selection.
13. Seat selection.
14. Booking summary.
15. Confirmation.
16. Customer dashboard.
17. Customer bookings/profile.
18. Admin dashboard.
19. Admin CRUD.
20. Booking/payment management.
21. Loading/empty/error states.
22. Responsive cleanup.
23. Remove all remaining mock data.
24. Final API and UX review.

## 25. Final Acceptance Criteria

The application is complete when:
- Angular app runs successfully.
- Real backend APIs are integrated.
- Login/register work.
- CUSTOMER and ADMIN roles work.
- Protected routes work.
- Customers can browse hotels.
- Customers can view details and rooms.
- Customers can create hotel bookings.
- Suitable bus trips are displayed from backend APIs.
- Bus transportation remains optional.
- Customers can select seats.
- Customers can review and confirm bookings.
- Customers can view booking history/details.
- Admin can access the dashboard.
- Admin CRUD uses real APIs.
- Loading, empty and error states exist.
- Forms are validated.
- No fake production data remains.
- Backend business rules are respected.
- Responsive design works.
- Maximalist travel-tech visual direction is consistent.
- Customer and Admin experiences are clearly separated.
- No unnecessary dependencies or architecture are introduced.

## 26. Final Rule

Build according to the **actual existing Angular project and backend API contract**.

Do not fabricate backend behavior, endpoints or business rules.

Keep business logic in the backend.

Keep Angular code clean, understandable and maintainable.

The final product should feel like a **premium maximalist travel-tech booking platform**, not a generic university CRUD website.
