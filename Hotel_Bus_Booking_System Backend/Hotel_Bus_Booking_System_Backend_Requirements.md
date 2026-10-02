# Hotel & Bus Booking System --- Backend Requirements

## 1. Project Overview

Build the backend for a **Hotel & Bus Booking System** using **Java
Spring Boot**.

The current scope is **backend only**.

The system allows a user to:

1.  Browse/search hotels.
2.  View hotel details and rooms.
3.  Book a hotel room for a specific check-in/check-out period.
4.  After a hotel booking (or selected hotel/date range), receive
    suitable bus-trip recommendations.
5.  Optionally book an outgoing bus trip and/or a return bus trip.
6.  A hotel booking must **not** require a bus booking.

The transportation recommendation is based on the relationship between:

``` text
Hotel
  ↓
Nearby Bus Stop
  ↓
Bus Route
  ↓
Bus Trip
```

and the hotel stay dates/times.

------------------------------------------------------------------------

# 2. Core Business Concept

The system has two independent reservation concepts:

### Hotel Reservation

A user selects:

-   Hotel
-   Room
-   Check-in date
-   Check-out date
-   Number of guests

The system checks room availability based on existing bookings.

### Optional Transportation

After selecting/booking the hotel, the system finds suitable bus trips.

#### Outgoing Trip

A suitable outgoing trip should:

-   Serve the destination/location associated with the selected hotel.
-   Arrive early enough for hotel check-in.
-   Be available for booking.

#### Return Trip

A suitable return trip should:

-   Depart from the destination/nearby bus stop.
-   Depart after hotel check-out.
-   Be available for booking.

The user may:

-   Book both.
-   Book only outgoing.
-   Book only return.
-   Skip transportation completely.

------------------------------------------------------------------------

# 3. Backend Technology

Use:

-   Java
-   Spring Boot
-   Spring Web
-   Spring Data JPA
-   Hibernate / ORM
-   Oracle Database
-   Lombok
-   MapStruct
-   Swagger / OpenAPI

Do not introduce additional frameworks or architectural patterns unless
they are genuinely required.

------------------------------------------------------------------------

# 4. Architecture

Follow a clean layered Spring Boot architecture.

The project must be organized into separate packages/layers:

``` text
com.spring.boot
│
├── config
│
├── controller
│
├── dto
│
├── enum
│
├── exception
│
├── helper
│
├── mapper
│
├── model
│
├── repository
│
└── service
    ├── interface
    └── impl
```

The exact package names may be adapted to the existing project package
structure, but the architectural separation must remain.

------------------------------------------------------------------------

# 5. Model / Entity Layer

All database entities must be placed in the `model` package.

Use:

-   `@Entity`
-   `@Table`
-   `@Id`
-   Appropriate JPA relationship annotations
-   Lombok annotations
-   `BaseEntity` when appropriate

The entities should represent the final relational database design.

Do not expose entities directly through REST controllers.

Use DTOs for API communication.

------------------------------------------------------------------------

# 6. Final Database Model

The initial database design contains the following core tables/entities:

1.  User
2.  Hotel
3.  Room
4.  HotelBooking
5.  Bus
6.  BusSeat
7.  BusStop
8.  BusRoute
9.  BusTrip
10. BusBooking
11. HotelBusStop
12. Booking
13. Payment

Before implementation, verify relationships and constraints carefully.

Do not add tables just to increase the project size.

------------------------------------------------------------------------

# 7. Entity Requirements

## 7.1 User

Represents a system user.

Suggested fields:

-   id
-   name
-   email
-   password
-   phoneNumber
-   role

Requirements:

-   Email should be unique.
-   Role should be represented using an enum.
-   Password must not be returned in response DTOs.
-   Use Lombok.
-   Do not expose the entity directly.

------------------------------------------------------------------------

## 7.2 Hotel

Represents a hotel.

Suggested fields:

-   id
-   name
-   description
-   address
-   city
-   latitude
-   longitude
-   rating
-   checkInTime
-   checkOutTime

Relationships:

``` text
Hotel 1 ──── N Room
Hotel 1 ──── N HotelBooking
Hotel 1 ──── N HotelBusStop
```

------------------------------------------------------------------------

## 7.3 Room

Represents a hotel room.

Suggested fields:

-   id
-   hotel
-   roomNumber
-   roomType
-   capacity
-   pricePerNight

Relationship:

``` text
Hotel 1 ──── N Room
```

A room belongs to exactly one hotel.

------------------------------------------------------------------------

## 7.4 HotelBooking

Represents a hotel-room reservation.

Suggested fields:

-   id
-   user
-   room
-   checkIn
-   checkOut
-   guests
-   status
-   totalPrice

Requirements:

-   Check-out must be after check-in.
-   Guests must not exceed room capacity.
-   Confirmed bookings must not overlap for the same room.
-   Availability must be calculated from booking records, not from a
    simple permanent boolean field.
-   Total price should represent the reservation price according to the
    selected stay.

------------------------------------------------------------------------

## 7.5 Bus

Represents a physical bus.

Suggested fields:

-   id
-   busNumber
-   company
-   capacity
-   busType

Relationship:

``` text
Bus 1 ──── N BusSeat
Bus 1 ──── N BusTrip
```

------------------------------------------------------------------------

## 7.6 BusSeat

Represents an individual seat belonging to a bus.

Suggested fields:

-   id
-   bus
-   seatNumber
-   seatType

Requirements:

-   Seat number should be unique within the same bus.
-   A seat belongs to one bus.
-   A seat is not globally "available/unavailable"; availability depends
    on a specific bus trip.

------------------------------------------------------------------------

## 7.7 BusStop

Represents a transportation stop/station.

Suggested fields:

-   id
-   name
-   city
-   address
-   latitude
-   longitude

A bus stop may be used by multiple routes and may be associated with
multiple hotels.

------------------------------------------------------------------------

## 7.8 BusRoute

Represents a logical transportation route.

Suggested fields:

-   id
-   name
-   originStop
-   destinationStop
-   duration

Example:

``` text
Cairo → Hurghada
```

A route represents the path/service definition, not a specific
departure.

------------------------------------------------------------------------

## 7.9 BusTrip

Represents a scheduled trip on a route.

Suggested fields:

-   id
-   bus
-   route
-   departureTime
-   arrivalTime
-   price
-   status

Example:

``` text
Route: Cairo → Hurghada
Bus: 102
Departure: 08:00
Arrival: 14:00
```

Important distinction:

``` text
BusRoute = logical route
BusTrip  = scheduled occurrence of that route
```

------------------------------------------------------------------------

## 7.10 BusBooking

Represents a user's reservation of a seat on a specific bus trip.

Suggested fields:

-   id
-   user
-   busTrip
-   seat
-   bookingDate
-   status
-   price

Requirements:

-   The same seat cannot be booked twice for the same trip when the
    bookings are confirmed/active.
-   The selected seat must belong to the bus assigned to the selected
    trip.
-   Availability must be calculated per trip.

------------------------------------------------------------------------

## 7.11 HotelBusStop

Represents the relationship between a hotel and a nearby bus stop.

Suggested fields:

-   id
-   hotel
-   busStop
-   distance

Purpose:

It allows the system to identify transportation options that are
geographically relevant to a hotel without creating a direct Hotel → Bus
relationship.

------------------------------------------------------------------------

## 7.12 Booking

Represents the parent booking/reservation context if the final design
requires grouping multiple reservation components.

It may be used to group:

``` text
User
  ↓
Booking
  ├── HotelBooking
  ├── Going BusBooking
  └── Return BusBooking
```

Important:

Do not duplicate information unnecessarily between `Booking`,
`HotelBooking`, and `BusBooking`.

Before implementation, validate whether the parent `Booking` abstraction
is needed for the required use cases. If it creates unnecessary
duplication, simplify the model rather than keeping it only because it
was initially proposed.

------------------------------------------------------------------------

## 7.13 Payment

Represents payment information associated with a booking.

Suggested fields:

-   id
-   booking
-   amount
-   paymentMethod
-   paymentStatus
-   transactionDate

Payment is conceptually separate from the reservation itself.

Do not implement a real external payment gateway unless explicitly
requested later.

------------------------------------------------------------------------

# 8. Enums

Use enums where the domain has a fixed set of meaningful states/types.

Potential enums include:

``` text
Role
RoomType
BookingStatus
BusTripStatus
PaymentMethod
PaymentStatus
SeatType
```

Do not create an enum for values that are genuinely free-form.

Use JPA enum mapping appropriately.

------------------------------------------------------------------------

# 9. DTO Layer

Create DTOs for API requests and responses.

Do not expose JPA entities directly from controllers.

For each main entity, create appropriate:

``` text
CreateRequest / Request DTO
UpdateRequest / Update DTO
Response DTO
```

The exact DTO split should follow the actual CRUD requirements rather
than creating unnecessary DTO classes.

DTOs should:

-   Contain API-facing data.
-   Avoid exposing sensitive fields.
-   Avoid circular entity relationships.
-   Be suitable for JSON serialization.
-   Contain validation annotations where appropriate.

------------------------------------------------------------------------

# 10. Mapper Layer

Use **MapStruct** for entity ↔ DTO mapping.

Do NOT create manual mapper classes.

Example architectural pattern:

``` text
Entity
   ↕
MapStruct Mapper
   ↕
DTO
```

MapStruct mappers should use Spring component integration.

Use the MapStruct dependency already defined in the project.

Mapping logic should not be duplicated inside controllers or services.

------------------------------------------------------------------------

# 11. Repository Layer

Use Spring Data JPA repositories.

Each persistent entity should have its own repository when database
access is required.

Example:

``` text
UserRepository
HotelRepository
RoomRepository
HotelBookingRepository
BusRepository
BusSeatRepository
BusStopRepository
BusRouteRepository
BusTripRepository
BusBookingRepository
HotelBusStopRepository
BookingRepository
PaymentRepository
```

Repositories must extend an appropriate Spring Data interface.

Do NOT write SQL scripts for normal CRUD or business queries.

Prefer:

-   Derived query methods.
-   JPA relationships.
-   JPQL only when genuinely necessary.
-   Spring Data JPA functionality.

The database interaction must be handled through JPA/ORM.

Do not create unnecessary native SQL queries.

------------------------------------------------------------------------

# 12. Service Layer

The service layer MUST be divided into:

``` text
service/interface
service/impl
```

Every service interface must have a corresponding implementation.

Example:

``` text
HotelService
HotelServiceImpl
```

The interface defines the contract.

The implementation contains the actual business logic.

Controllers must depend on the service interface, not directly on
repositories.

------------------------------------------------------------------------

# 13. Service Responsibilities

Services should contain business logic such as:

-   Entity existence checks.
-   DTO ↔ entity mapping coordination.
-   Validation beyond simple DTO validation.
-   Availability checks.
-   Booking conflict checks.
-   Relationship validation.
-   Calculating booking totals.
-   Finding suitable bus trips.
-   Preventing duplicate seat bookings.
-   Managing booking statuses.

Do not put business logic inside controllers.

Controllers should remain thin.

------------------------------------------------------------------------

# 14. No SQL Scripts for Application Logic

Do NOT create SQL scripts for:

-   CRUD.
-   GET queries.
-   INSERT operations.
-   UPDATE operations.
-   DELETE operations.
-   Availability queries.
-   Normal relationship queries.

Use Spring Data JPA / Hibernate / ORM.

The database schema should be generated/managed through the
application's JPA configuration where appropriate.

Do not manually write schema SQL unless there is a specific database
requirement that cannot reasonably be handled by JPA.

------------------------------------------------------------------------

# 15. Controller Layer

Each main resource must have its own controller.

Examples:

``` text
UserController
HotelController
RoomController
HotelBookingController
BusController
BusSeatController
BusStopController
BusRouteController
BusTripController
BusBookingController
HotelBusStopController
BookingController
PaymentController
```

Do NOT create one shared/generic controller for all models.

Each controller should be responsible for its own resource.

------------------------------------------------------------------------

# 16. Controller Rules

Controllers must:

-   Use `ResponseEntity`.
-   Return DTOs.
-   Depend on service interfaces.
-   Remain thin.
-   Validate request DTOs.
-   Delegate business logic to services.

Do NOT use a shared `ApiResponse<T>` wrapper.

Return the actual response DTO/data through `ResponseEntity<T>`.

Example style:

``` text
ResponseEntity<HotelResponse>
ResponseEntity<List<HotelResponse>>
```

not:

``` text
ResponseEntity<ApiResponse<HotelResponse>>
```

------------------------------------------------------------------------

# 17. Standard CRUD Pattern

Where CRUD is applicable, follow a consistent naming pattern:

``` text
create(...)
update(...)
delete(...)
findById(...)
findAll(...)
```

Use REST conventions:

``` text
POST
GET
PUT/PATCH where appropriate
DELETE
```

Do not create unnecessary endpoints.

------------------------------------------------------------------------

# 18. Special Business Endpoints

Some operations are not simple CRUD and should have dedicated service
methods/endpoints.

Examples:

### Hotel Availability

``` text
Find available rooms for:
hotel + checkIn + checkOut
```

### Suitable Bus Trips

``` text
Find suitable outgoing trips
```

based on:

-   hotel
-   check-in date/time
-   destination/nearby bus stop
-   trip arrival time

### Suitable Return Trips

``` text
Find suitable return trips
```

based on:

-   hotel
-   check-out date/time
-   nearby bus stop
-   trip departure time

These operations belong in the service layer.

Do not implement their logic directly in controllers.

------------------------------------------------------------------------

# 19. Transportation Matching Logic

The system should conceptually follow:

``` text
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

For outgoing transportation:

``` text
Trip destination / relevant stop
+
Trip arrival time
+
Hotel check-in date/time
=
Suitable outgoing trip
```

The trip must arrive early enough for the user to reach/check in at the
hotel.

For return transportation:

``` text
Hotel check-out date/time
+
Trip departure time
+
Relevant bus stop
=
Suitable return trip
```

The trip must depart after check-out with an appropriate time buffer.

The exact buffer should be represented as a clear business
rule/configuration rather than duplicated as magic numbers throughout
the code.

------------------------------------------------------------------------

# 20. Availability Rules

## Hotel Rooms

A room is unavailable if it has a confirmed/active booking overlapping
the requested period.

Do not rely on:

``` text
room.available = true/false
```

as the source of truth.

Use booking records and date ranges.

## Bus Seats

A seat is unavailable for a specific `BusTrip` if an active/confirmed
`BusBooking` already uses that seat for that trip.

The same physical seat may be booked on different trips.

------------------------------------------------------------------------

# 21. Exception Handling

All runtime business errors must use a centralized exception-handling
mechanism.

Use:

``` text
exception/
    GlobalExceptionHandler
    ResourceNotFoundException
    ...
```

The exact exception classes can be expanded when required.

Controllers should NOT contain repeated try/catch blocks for normal
business errors.

------------------------------------------------------------------------

# 22. Bundle Messages and i18n

All user-facing error messages must use the existing **Bundle Message /
i18n** approach.

Use the project's message bundle mechanism, such as:

``` text
BundleMessageService
```

Do not hardcode repeated error messages inside services/controllers.

Example conceptual flow:

``` text
Service
 ↓
throws RuntimeException / custom RuntimeException
 ↓
GlobalExceptionHandler
 ↓
BundleMessageService
 ↓
localized response message
```

The existing project convention for message keys and localization should
be followed.

------------------------------------------------------------------------

# 23. Runtime Exceptions

Business errors should be represented using runtime exceptions/custom
runtime exceptions where appropriate.

Examples:

-   Resource not found.
-   Room unavailable.
-   Room booking conflict.
-   Invalid booking dates.
-   Invalid guest count.
-   Bus trip unavailable.
-   Seat already booked.
-   Seat does not belong to the selected bus.
-   Invalid route/trip relationship.
-   Invalid payment/booking state.

Do not silently return null for business errors.

Do not use `try/catch` everywhere just to handle expected service
errors.

------------------------------------------------------------------------

# 24. Global Exception Handler

Implement a centralized:

``` text
GlobalExceptionHandler
```

Responsibilities:

-   Handle known application/runtime exceptions.
-   Convert exceptions into consistent HTTP responses.
-   Resolve localized messages using the bundle/i18n mechanism.
-   Handle validation errors.
-   Handle unexpected exceptions safely.

Do not duplicate exception-response logic across controllers.

------------------------------------------------------------------------

# 25. Validation

Use Jakarta Bean Validation where applicable.

Examples:

``` text
@NotBlank
@NotNull
@Email
@Size
@Positive
@PositiveOrZero
```

Use validation for request DTOs.

Business validations that require database access belong in the service
layer.

Example:

``` text
@NotNull
checkIn

@NotNull
checkOut
```

but:

``` text
checkOut > checkIn
```

should be validated as business logic.

------------------------------------------------------------------------

# 26. Swagger / OpenAPI

Use Swagger / OpenAPI documentation.

Document:

-   Controllers.
-   Main endpoints.
-   Request DTOs.
-   Response DTOs.
-   Important endpoint behavior.
-   Common response/error information where appropriate.

Swagger should be available through the project's configured OpenAPI
setup.

Do not over-document trivial internal methods.

------------------------------------------------------------------------

# 27. Configuration

Keep configuration in the `config` package.

Configuration should include only what is actually needed by the
application.

Potential configuration areas:

-   Database
-   JPA/Hibernate
-   Swagger/OpenAPI
-   CORS if frontend integration is added
-   Application-level constants/configuration

Do not put business logic inside configuration classes.

------------------------------------------------------------------------

# 28. Lombok

Use Lombok to reduce boilerplate, especially in entities/models.

Follow the existing project convention.

Do not manually write unnecessary getters/setters/constructors when
Lombok is already being used.

Avoid excessive Lombok annotations when they can create JPA problems.

Be especially careful with:

-   `@ToString`
-   `@EqualsAndHashCode`
-   Bidirectional JPA relationships

Do not generate recursive `toString()` or equality implementations
across relationships.

------------------------------------------------------------------------

# 29. JPA Relationship Guidelines

Use proper JPA mappings.

Examples:

``` text
Hotel 1:N Room
Hotel 1:N HotelBooking
User 1:N HotelBooking
User 1:N BusBooking
Bus 1:N BusSeat
Bus 1:N BusTrip
BusRoute N:1 BusStop (origin)
BusRoute N:1 BusStop (destination)
BusTrip N:1 Bus
BusTrip N:1 BusRoute
Hotel N:M BusStop through HotelBusStop
```

The exact final relationship model must be reviewed before
implementation.

Avoid unnecessary bidirectional relationships.

Prefer the simplest relationship direction that satisfies the use case.

------------------------------------------------------------------------

# 30. Base Entity

If the existing project pattern uses a common `BaseEntity`, follow it.

Typical shared audit fields may include:

``` text
createdAt
updatedAt
```

Do not duplicate these fields in every entity.

Use the existing project convention for JPA auditing if already
established.

------------------------------------------------------------------------

# 31. Package Responsibility Summary

``` text
model
    Database entities / JPA entities

dto
    API request/response objects

repository
    Spring Data JPA repositories

mapper
    MapStruct entity ↔ DTO mappings

service/interface
    Service contracts

service/impl
    Business logic implementations

controller
    REST endpoints

enum
    Domain enums

config
    Application configuration

exception
    Runtime exceptions and GlobalExceptionHandler

helper
    Shared helpers such as BundleMessageService / response message helpers
```

------------------------------------------------------------------------

# 32. Dependency Flow

Follow this direction:

``` text
Controller
    ↓
Service Interface
    ↓
Service Implementation
    ↓
Repository
    ↓
JPA / Hibernate
    ↓
Oracle Database
```

Mapping:

``` text
Controller
    ↕
DTO
    ↕
MapStruct Mapper
    ↕
Entity
```

Exception handling:

``` text
Service
    ↓
RuntimeException
    ↓
GlobalExceptionHandler
    ↓
BundleMessageService / i18n
    ↓
HTTP Error Response
```

Do NOT bypass layers.

For example:

``` text
Controller → Repository
```

is not allowed.

------------------------------------------------------------------------

# 33. Code Quality Rules

The implementation must:

-   Follow clean naming.
-   Keep classes focused.
-   Avoid duplicated logic.
-   Avoid unnecessary abstractions.
-   Avoid generic base classes unless already part of the project
    pattern.
-   Avoid manual mapping.
-   Avoid exposing entities.
-   Avoid SQL scripts for normal application operations.
-   Avoid fat controllers.
-   Avoid putting business logic in DTOs.
-   Avoid putting business logic in entities unless appropriate for the
    domain.
-   Avoid magic numbers and magic strings.
-   Keep the implementation understandable for a university project.

------------------------------------------------------------------------

# 34. What NOT To Do

The agent must NOT:

-   Build the frontend.
-   Use TypeScript.
-   Create React code.
-   Create manual MapStruct-like mapper classes.
-   Put all entities in one file.
-   Create one controller for all entities.
-   Create one service for all entities.
-   Put repository calls directly in controllers.
-   Put all service logic inside interfaces.
-   Put implementation logic inside service interfaces.
-   Use a shared `ApiResponse` wrapper.
-   Write SQL scripts for normal CRUD/queries.
-   Hardcode localized error messages.
-   Duplicate exception handling in every controller.
-   Add unnecessary microservices.
-   Add unnecessary design patterns.
-   Over-engineer the project.
-   Add features that are not part of the requirements.
-   Treat bus booking as mandatory for hotel booking.

------------------------------------------------------------------------

# 35. Development Order

Implement the backend in a logical order.

Recommended order:

``` text
1. Project configuration
2. BaseEntity (if required)
3. Enums
4. Models / Entities
5. JPA relationships
6. Repositories
7. DTOs
8. MapStruct mappers
9. Exceptions + GlobalExceptionHandler
10. BundleMessageService / i18n
11. Service interfaces
12. Service implementations
13. Controllers
14. Swagger/OpenAPI
15. Validation
16. Business logic
17. Final consistency review
```

Do not generate the entire project blindly without validating
relationships first.

------------------------------------------------------------------------

# 36. Important Final Rule

This project should follow the same architecture and coding style used
in the existing backend projects.

The goal is:

``` text
Clean
Simple
Layered
JPA-based
DTO-based
MapStruct-based
Lombok-based
Swagger-documented
Exception-handled
i18n-aware
```

while avoiding unnecessary complexity.

The backend should be designed so that every model has a clear
responsibility, every relationship has a business reason, and every
piece of business logic lives in the appropriate service implementation.

The system is **backend-only at this stage**.
