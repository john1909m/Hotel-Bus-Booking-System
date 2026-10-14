# Inventory of GET Endpoints Returning Collections

## Paginated Endpoints

| Path | Service Method | Who Calls It | Current Filtering | Decision |
|------|----------------|--------------|-------------------|----------|
| GET /api/users | userService.getAllUsers() | Admin UI | None | PAGINATE |
| GET /api/hotels | hotelService.getAllHotels() | Public | None | PAGINATE |
| GET /api/buses | busService.getAllBuses() | Admin UI | None | PAGINATE |
| GET /api/bus-stops | busStopService.getAllBusStops() | Admin UI | None | PAGINATE |
| GET /api/bus-routes | busRouteService.getAllBusRoutes() | Admin UI | None | PAGINATE |
| GET /api/bus-trips | busTripService.getAllBusTrips() | Admin UI | None | PAGINATE |
| GET /api/bus-trips/bus/{busId} | busTripService.getBusTripsByBusId(busId) | Admin/UI for bus management | None (filtered by busId) | PAGINATE |
| GET /api/bus-trips/route/{routeId} | busTripService.getBusTripsByRouteId(routeId) | Admin/UI for route management | None (filtered by routeId) | PAGINATE |
| GET /api/hotel-bus-stops | hotelBusStopService.getAllHotelBusStops() | Admin UI | None | PAGINATE |
| GET /api/hotel-bus-stops/hotel/{hotelId} | hotelBusStopService.getHotelBusStopsByHotelId(hotelId) | Admin UI (hotel connections) | None (filtered by hotelId) | PAGINATE |
| GET /api/hotel-bus-stops/bus-stop/{busStopId} | hotelBusStopService.getHotelBusStopsByBusStopId(busStopId) | Admin UI | None (filtered by busStopId) | PAGINATE |
| GET /api/rooms | roomService.getAllRooms() | Admin UI | None | PAGINATE |
| GET /api/rooms/hotel/{hotelId} | roomService.getRoomsByHotelId(hotelId) | UI for hotel room display | None (filtered by hotelId) | KEEP AS LIST |
| GET /api/hotel-bookings | hotelBookingService.getAllHotelBookings() | Admin UI | None | PAGINATE |
| GET /api/hotel-bookings/user/{userId} | hotelBookingService.getHotelBookingsByUserId(userId) | Admin UI or user | None (filtered by userId) | PAGINATE |
| GET /api/hotel-bookings/my | hotelBookingService.getMyHotelBookings(userId) | User UI ("my bookings") | None (filtered by current user) | PAGINATE |
| GET /api/hotel-bookings/hotel/{hotelId} | hotelBookingService.getHotelBookingsByHotelId(hotelId) | UI for hotel management | None (filtered by hotelId) | PAGINATE |
| GET /api/bus-bookings | busBookingService.getAllBusBookings() | Admin UI | None | PAGINATE |
| GET /api/bus-bookings/user/{userId} | busBookingService.getBusBookingsByUserId(userId) | Admin UI or user | None (filtered by userId) | PAGINATE |
| GET /api/bus-bookings/my | busBookingService.getMyBusBookings(userId) | User UI | None (filtered by current user) | PAGINATE |
| GET /api/bus-bookings/bus-trip/{busTripId} | busBookingService.getBusBookingsByBusTripIdPaginated(busTripId) | UI for bus trip management | None (filtered by busTripId) | PAGINATE |
| GET /api/payments | paymentService.getAllPayments() | Admin UI | None | PAGINATE |
| GET /api/payments/hotel-booking/{hotelBookingId} | paymentService.getPaymentsByHotelBookingId(hotelBookingId) | UI for payment viewing | None (filtered by hotelBookingId) | KEEP AS LIST |
| GET /api/payments/bus-booking/{busBookingId} | paymentService.getPaymentsByBusBookingId(busBookingId) | UI for payment viewing | None (filtered by busBookingId) | KEEP AS LIST |
| GET /api/bus-seats | busSeatService.getAllBusSeats() | Admin UI | None | PAGINATE |
| GET /api/bus-seats/bus/{busId} = busSeatService.getBusSeatsByBusId(busId) | UI for seat map | None (filtered by busId) | KEEP AS LIST |

## Lookup Endpoints (for dropdowns)

| Path | Service Method | Who Calls It | Current Filtering | Decision |
|------|----------------|--------------|-------------------|----------|
| GET /api/users/lookup | userService.lookupUsers(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/hotels/lookup | hotelService.lookupHotels(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/buses/lookup | busService.lookupBuses(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/bus-stops/lookup | busStopService.lookupBusStops(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/bus-routes/lookup | busRouteService.lookupBusRoutes(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/bus-trips/lookup | busTripService.lookupBusTrips(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/bus-bookings/lookup | busBookingService.lookupBusBookings(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |
| GET /api/hotel-bus-stops/lookup | hotelBusStopService.lookupHotelBusStops(query, limit) | UI dropdowns | q=search query, limit=max results | LOOKUP |