package com.spring.boot.service.impl;

import com.spring.boot.dto.ai.*;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.enums.DraftSource;
import com.spring.boot.enums.DraftStatus;
import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.exception.*;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.*;
import com.spring.boot.repository.*;
import com.spring.boot.service.interfaces.BookingDraftService;
import com.spring.boot.service.interfaces.BusBookingService;
import com.spring.boot.service.interfaces.HotelBookingService;
import com.spring.boot.service.interfaces.PaymentService;
import com.spring.boot.service.interfaces.PricingService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookingDraftServiceImpl implements BookingDraftService {

    private static final ZoneId CAIRO_ZONE = ZoneId.of("Africa/Cairo");

    private final BookingDraftRepository bookingDraftRepository;
    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final BusTripRepository busTripRepository;
    private final BusSeatRepository busSeatRepository;
    private final BusBookingRepository busBookingRepository;
    private final HotelBookingRepository hotelBookingRepository;
    private final HotelBookingRoomRepository hotelBookingRoomRepository;
    private final UserRepository userRepository;
    private final HotelBookingService hotelBookingService;
    private final BusBookingService busBookingService;
    private final PaymentService paymentService;
    private final PricingService pricingService;
    private final BundleMessageService bundleMessageService;

    @Value("${ai.draft.ttl-minutes:30}")
    private Long draftTtlMinutes;

    public BookingDraftServiceImpl(BookingDraftRepository bookingDraftRepository,
                                   HotelRepository hotelRepository,
                                   RoomRepository roomRepository,
                                   BusTripRepository busTripRepository,
                                   BusSeatRepository busSeatRepository,
                                   BusBookingRepository busBookingRepository,
                                   HotelBookingRepository hotelBookingRepository,
                                   HotelBookingRoomRepository hotelBookingRoomRepository,
                                   UserRepository userRepository,
                                   HotelBookingService hotelBookingService,
                                   BusBookingService busBookingService,
                                   PaymentService paymentService,
                                   PricingService pricingService,
                                   BundleMessageService bundleMessageService) {
        this.bookingDraftRepository = bookingDraftRepository;
        this.hotelRepository = hotelRepository;
        this.roomRepository = roomRepository;
        this.busTripRepository = busTripRepository;
        this.busSeatRepository = busSeatRepository;
        this.busBookingRepository = busBookingRepository;
        this.hotelBookingRepository = hotelBookingRepository;
        this.hotelBookingRoomRepository = hotelBookingRoomRepository;
        this.userRepository = userRepository;
        this.hotelBookingService = hotelBookingService;
        this.busBookingService = busBookingService;
        this.paymentService = paymentService;
        this.pricingService = pricingService;
        this.bundleMessageService = bundleMessageService;
    }

    @Override
    @Transactional
    public BookingDraftResponse createDraft(Long userId, BookingDraftRequest request) {
        // 1. Validate hotel exists
        Hotel hotel = hotelRepository.findById(request.hotelId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));

        // 2. Validate room selections (multiple rooms in the same hotel, max 10, no duplicates)
        List<Long> requestedRoomIds = request.roomIds();
        if (requestedRoomIds == null || requestedRoomIds.isEmpty()) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.rooms_required"));
        }
        if (requestedRoomIds.size() > 10) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.rooms_required"));
        }

        Set<Long> uniqueRoomIds = new HashSet<>(requestedRoomIds);
        if (uniqueRoomIds.size() != requestedRoomIds.size()) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.duplicate_selection"));
        }

        List<Room> rooms = roomRepository.findAllById(requestedRoomIds);
        if (rooms.size() != requestedRoomIds.size()) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.room_not_in_hotel"));
        }

        // All rooms must belong to the specified hotel
        for (Room room : rooms) {
            if (!room.getHotel().getId().equals(hotel.getId())) {
                throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.room_not_in_hotel"));
            }
        }

        // 3. Validate stay dates
        LocalDate checkIn = request.checkInDate();
        LocalDate checkOut = request.checkOutDate();
        if (checkOut == null || checkIn == null || checkOut.isBefore(checkIn) || checkOut.isEqual(checkIn)) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_out_before_check_in"));
        }
        if (checkIn.isBefore(LocalDate.now())) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_in_past"));
        }

        // 4. Validate per-room availability (reuse existing availability logic)
        for (Room room : rooms) {
            if (!hotelBookingService.isRoomAvailable(hotel.getId(), checkIn, checkOut, room.getId())) {
                throw new RoomUnavailableException(
                        bundleMessageService.getMessage("error.draft.room_unavailable", new Object[]{room.getRoomNumber()})
                );
            }
        }

        // 5. Validate total capacity against required guest capacity
        int totalCapacity = rooms.stream().mapToInt(Room::getCapacity).sum();
        int requiredCapacity = hotelBookingService.calculateRequiredCapacity(
                request.adults(),
                request.childAges(),
                request.guests()
        );
        if (requiredCapacity > totalCapacity) {
            throw new InvalidGuestCountException(
                    bundleMessageService.getMessage("error.draft.capacity_exceeded", new Object[]{requiredCapacity, totalCapacity})
            );
        }

        int effectiveAdults = request.adults() != null
                ? request.adults()
                : (request.guests() != null ? request.guests() : 1);
        List<Integer> effectiveChildAges = request.childAges() != null
                ? request.childAges()
                : Collections.emptyList();
        int totalHotelGuests = effectiveAdults + effectiveChildAges.size();

        // 6. Validate transport selections (if present)
        int transportPassengers = request.transportPassengers() != null
                ? request.transportPassengers()
                : totalHotelGuests;

        BusTrip goingTrip = null;
        List<BusSeat> goingSeatsList = new ArrayList<>();
        BigDecimal goingTransportPrice = BigDecimal.ZERO;
        if (request.goingTripId() != null) {
            goingTrip = busTripRepository.findById(request.goingTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));
            validateTripBookable(goingTrip);

            List<Long> goingSeatIds = request.goingSeatIds();
            if (goingSeatIds == null || goingSeatIds.isEmpty()) {
                throw new InvalidSeatException(bundleMessageService.getMessage("error.invalid_seat"));
            }
            Set<Long> uniqueGoingSeats = new HashSet<>(goingSeatIds);
            if (uniqueGoingSeats.size() != goingSeatIds.size()) {
                throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.duplicate_selection"));
            }

            // Transport rule: seats per direction == transport passengers, and transport passengers <= total hotel guests
            if (goingSeatIds.size() != transportPassengers || transportPassengers > totalHotelGuests) {
                throw new InvalidSeatException(
                        bundleMessageService.getMessage("error.draft.seat_count_mismatch", new Object[]{transportPassengers, goingSeatIds.size()})
                );
            }

            for (Long seatId : goingSeatIds) {
                BusSeat seat = busSeatRepository.findById(seatId)
                        .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));
                if (seat.getBus() == null || goingTrip.getBus() == null || !seat.getBus().getId().equals(goingTrip.getBus().getId())) {
                    throw new InvalidSeatException(bundleMessageService.getMessage("error.draft.seat_from_other_bus"));
                }
                if (!busBookingService.isSeatAvailable(goingTrip.getId(), seatId)) {
                    throw new SeatAlreadyBookedException(
                            bundleMessageService.getMessage("error.draft.seat_unavailable", new Object[]{seat.getSeatNumber()})
                    );
                }
                goingSeatsList.add(seat);
            }

            BigDecimal pricePerSeat = pricingService.calculateBusTripPrice(goingTrip).getTotal();
            goingTransportPrice = pricePerSeat.multiply(BigDecimal.valueOf(goingSeatIds.size()));
        }

        BusTrip returnTrip = null;
        List<BusSeat> returnSeatsList = new ArrayList<>();
        BigDecimal returnTransportPrice = BigDecimal.ZERO;
        if (request.returnTripId() != null) {
            returnTrip = busTripRepository.findById(request.returnTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));
            validateTripBookable(returnTrip);

            List<Long> returnSeatIds = request.returnSeatIds();
            if (returnSeatIds == null || returnSeatIds.isEmpty()) {
                throw new InvalidSeatException(bundleMessageService.getMessage("error.invalid_seat"));
            }
            Set<Long> uniqueReturnSeats = new HashSet<>(returnSeatIds);
            if (uniqueReturnSeats.size() != returnSeatIds.size()) {
                throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.duplicate_selection"));
            }

            // Transport rule
            if (returnSeatIds.size() != transportPassengers || transportPassengers > totalHotelGuests) {
                throw new InvalidSeatException(
                        bundleMessageService.getMessage("error.draft.seat_count_mismatch", new Object[]{transportPassengers, returnSeatIds.size()})
                );
            }

            for (Long seatId : returnSeatIds) {
                BusSeat seat = busSeatRepository.findById(seatId)
                        .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));
                if (seat.getBus() == null || returnTrip.getBus() == null || !seat.getBus().getId().equals(returnTrip.getBus().getId())) {
                    throw new InvalidSeatException(bundleMessageService.getMessage("error.draft.seat_from_other_bus"));
                }
                if (!busBookingService.isSeatAvailable(returnTrip.getId(), seatId)) {
                    throw new SeatAlreadyBookedException(
                            bundleMessageService.getMessage("error.draft.seat_unavailable", new Object[]{seat.getSeatNumber()})
                    );
                }
                returnSeatsList.add(seat);
            }

            BigDecimal pricePerSeat = pricingService.calculateBusTripPrice(returnTrip).getTotal();
            returnTransportPrice = pricePerSeat.multiply(BigDecimal.valueOf(returnSeatIds.size()));
        }

        // 7. Calculate hotel price: nights * pricePerNight for each room
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        BigDecimal hotelTotal = BigDecimal.ZERO;
        List<DraftRoomSnapshot> roomSnapshots = new ArrayList<>();
        for (Room room : rooms) {
            BigDecimal roomTotal = BigDecimal.valueOf(room.getPricePerNight()).multiply(BigDecimal.valueOf(nights));
            hotelTotal = hotelTotal.add(roomTotal);

            roomSnapshots.add(DraftRoomSnapshot.builder()
                    .roomId(room.getId())
                    .roomNumber(room.getRoomNumber())
                    .roomType(room.getRoomType() != null ? room.getRoomType().name() : null)
                    .capacity(room.getCapacity())
                    .pricePerNight(BigDecimal.valueOf(room.getPricePerNight()))
                    .build());
        }

        BigDecimal totalPrice = hotelTotal.add(goingTransportPrice).add(returnTransportPrice);

        // 8. Build Seat Snapshots
        List<DraftSeatSnapshot> goingSeatSnapshots = goingSeatsList.stream()
                .map(s -> DraftSeatSnapshot.builder()
                        .seatId(s.getId())
                        .seatNumber(s.getSeatNumber())
                        .seatType(s.getSeatType() != null ? s.getSeatType().name() : null)
                        .build())
                .collect(Collectors.toList());

        List<DraftSeatSnapshot> returnSeatSnapshots = returnSeatsList.stream()
                .map(s -> DraftSeatSnapshot.builder()
                        .seatId(s.getId())
                        .seatNumber(s.getSeatNumber())
                        .seatType(s.getSeatType() != null ? s.getSeatType().name() : null)
                        .build())
                .collect(Collectors.toList());

        Room firstRoom = rooms.get(0);

        // 9. Create draft entity
        BookingDraft draft = BookingDraft.builder()
                .userId(userId)
                .hotelId(hotel.getId())
                .hotelName(hotel.getName())
                // Legacy single-room fallback
                .roomId(firstRoom.getId())
                .roomNumber(firstRoom.getRoomNumber())
                .roomCapacity(firstRoom.getCapacity())
                .roomPricePerNight(BigDecimal.valueOf(firstRoom.getPricePerNight()))
                .rooms(roomSnapshots)
                .checkIn(checkIn)
                .checkOut(checkOut)
                .guests(totalHotelGuests)
                .adults(effectiveAdults)
                .childAges(new ArrayList<>(effectiveChildAges))
                .transportPassengers(transportPassengers)
                .outgoingTripId(request.goingTripId())
                .returnTripId(request.returnTripId())
                .outgoingSeatId(!goingSeatsList.isEmpty() ? goingSeatsList.get(0).getId() : null)
                .returnSeatId(!returnSeatsList.isEmpty() ? returnSeatsList.get(0).getId() : null)
                .goingSeats(goingSeatSnapshots)
                .returnSeats(returnSeatSnapshots)
                .hotelTotal(hotelTotal)
                .goingTransportPrice(goingTransportPrice)
                .returnTransportPrice(returnTransportPrice)
                .totalPrice(totalPrice)
                .status(DraftStatus.CREATED)
                .source(DraftSource.USER_SELECTED)
                .expiresAt(LocalDateTime.now().plusMinutes(draftTtlMinutes))
                .deleted(false)
                .build();

        // Legacy transport snapshots
        if (goingTrip != null && !goingSeatsList.isEmpty()) {
            BusSeat firstGoingSeat = goingSeatsList.get(0);
            draft.setGoingSeatNumber(firstGoingSeat.getSeatNumber());
            draft.setGoingSeatType(firstGoingSeat.getSeatType() != null ? firstGoingSeat.getSeatType().toString() : null);
            draft.setGoingTripPrice(pricingService.calculateBusTripPrice(goingTrip).getTotal());
            if (goingTrip.getRoute() != null) {
                draft.setGoingTripOrigin(goingTrip.getRoute().getOriginStop() != null ? goingTrip.getRoute().getOriginStop().getName() : null);
                draft.setGoingTripDestination(goingTrip.getRoute().getDestinationStop() != null ? goingTrip.getRoute().getDestinationStop().getName() : null);
            }
            draft.setGoingTripDepartureTime(goingTrip.getDepartureTime());
            draft.setGoingTripArrivalTime(goingTrip.getArrivalTime());
        }

        if (returnTrip != null && !returnSeatsList.isEmpty()) {
            BusSeat firstReturnSeat = returnSeatsList.get(0);
            draft.setReturnSeatNumber(firstReturnSeat.getSeatNumber());
            draft.setReturnSeatType(firstReturnSeat.getSeatType() != null ? firstReturnSeat.getSeatType().toString() : null);
            draft.setReturnTripPrice(pricingService.calculateBusTripPrice(returnTrip).getTotal());
            if (returnTrip.getRoute() != null) {
                draft.setReturnTripOrigin(returnTrip.getRoute().getOriginStop() != null ? returnTrip.getRoute().getOriginStop().getName() : null);
                draft.setReturnTripDestination(returnTrip.getRoute().getDestinationStop() != null ? returnTrip.getRoute().getDestinationStop().getName() : null);
            }
            draft.setReturnTripDepartureTime(returnTrip.getDepartureTime());
            draft.setReturnTripArrivalTime(returnTrip.getArrivalTime());
        }

        BookingDraft savedDraft = bookingDraftRepository.save(draft);
        return mapToResponse(savedDraft);
    }

    @Override
    public Optional<BookingDraftResponse> getDraft(Long draftId, Long userId) {
        Optional<BookingDraft> draftOpt = bookingDraftRepository.findByIdAndUserId(draftId, userId);
        if (draftOpt.isPresent()) {
            BookingDraft draft = draftOpt.get();
            if (draft.getExpiresAt().isBefore(LocalDateTime.now()) && draft.getStatus() == DraftStatus.CREATED) {
                draft.setStatus(DraftStatus.EXPIRED);
                bookingDraftRepository.save(draft);
                return Optional.empty();
            }
            return Optional.of(mapToResponse(draft));
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public BookingDraftResponse confirm(Long userId, Long draftId, String idempotencyKey) {
        // 1. Lock the draft row for update
        BookingDraft draft = bookingDraftRepository.findByIdAndUserIdForUpdate(draftId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.draft_not_found")));

        // 2. Check expiry
        if (draft.getExpiresAt().isBefore(LocalDateTime.now()) && draft.getStatus() == DraftStatus.CREATED) {
            draft.setStatus(DraftStatus.EXPIRED);
            bookingDraftRepository.save(draft);
            throw new DraftExpiredException(bundleMessageService.getMessage("error.draft_expired"));
        }

        // 3. Idempotency check: if already confirmed, return current state
        if (draft.getStatus() == DraftStatus.CONFIRMED) {
            return mapToResponse(draft);
        }

        if (draft.getStatus() == DraftStatus.EXPIRED || draft.getStatus() == DraftStatus.CANCELLED) {
            throw new DraftExpiredException(bundleMessageService.getMessage("error.draft_expired"));
        }

        // 4. Source guard: only user-initiated drafts can be confirmed
        if (draft.getSource() != DraftSource.USER_SELECTED) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        // 5. Re-check and lock rooms in ascending ID order
        List<Long> roomIds = draft.getRoomIds();
        if (roomIds.isEmpty()) {
            throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.rooms_required"));
        }
        List<Long> sortedRoomIds = roomIds.stream().sorted().toList();
        List<Room> rooms = roomRepository.findAllByIdsForUpdate(sortedRoomIds);
        if (rooms.size() != sortedRoomIds.size()) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found"));
        }

        for (Room room : rooms) {
            if (!room.getHotel().getId().equals(draft.getHotelId())) {
                throw new IllegalArgumentException(bundleMessageService.getMessage("error.draft.room_not_in_hotel"));
            }
            if (!hotelBookingService.isRoomAvailable(draft.getHotelId(), draft.getCheckIn(), draft.getCheckOut(), room.getId())) {
                throw new RoomUnavailableException(
                        bundleMessageService.getMessage("error.draft.room_unavailable", new Object[]{room.getRoomNumber()})
                );
            }
        }

        int totalCapacity = rooms.stream().mapToInt(Room::getCapacity).sum();
        int requiredCapacity = hotelBookingService.calculateRequiredCapacity(
                draft.getAdults(),
                draft.getChildAges(),
                draft.getGuests()
        );
        if (requiredCapacity > totalCapacity) {
            throw new InvalidGuestCountException(
                    bundleMessageService.getMessage("error.draft.capacity_exceeded", new Object[]{requiredCapacity, totalCapacity})
            );
        }

        // 6. Re-check and lock bus trips / seats (trip locked once per direction)
        BusTrip goingTrip = null;
        List<Long> goingSeatIds = draft.getOutgoingSeatIds();
        if (draft.getOutgoingTripId() != null && !goingSeatIds.isEmpty()) {
            goingTrip = busTripRepository.findByIdForUpdate(draft.getOutgoingTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));
            validateTripBookable(goingTrip);

            int expectedPassengers = draft.getTransportPassengers() != null ? draft.getTransportPassengers() : draft.getGuests();
            if (goingSeatIds.size() != expectedPassengers || goingSeatIds.size() > draft.getGuests()) {
                throw new InvalidSeatException(
                        bundleMessageService.getMessage("error.draft.seat_count_mismatch", new Object[]{expectedPassengers, goingSeatIds.size()})
                );
            }

            for (Long seatId : goingSeatIds) {
                BusSeat seat = busSeatRepository.findById(seatId)
                        .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));
                if (seat.getBus() == null || goingTrip.getBus() == null || !seat.getBus().getId().equals(goingTrip.getBus().getId())) {
                    throw new InvalidSeatException(bundleMessageService.getMessage("error.draft.seat_from_other_bus"));
                }
                if (!busBookingService.isSeatAvailable(goingTrip.getId(), seatId)) {
                    throw new SeatAlreadyBookedException(
                            bundleMessageService.getMessage("error.draft.seat_unavailable", new Object[]{seat.getSeatNumber()})
                    );
                }
            }
        }

        BusTrip returnTrip = null;
        List<Long> returnSeatIds = draft.getReturnSeatIds();
        if (draft.getReturnTripId() != null && !returnSeatIds.isEmpty()) {
            returnTrip = busTripRepository.findByIdForUpdate(draft.getReturnTripId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_trip_not_found")));
            validateTripBookable(returnTrip);

            int expectedPassengers = draft.getTransportPassengers() != null ? draft.getTransportPassengers() : draft.getGuests();
            if (returnSeatIds.size() != expectedPassengers || returnSeatIds.size() > draft.getGuests()) {
                throw new InvalidSeatException(
                        bundleMessageService.getMessage("error.draft.seat_count_mismatch", new Object[]{expectedPassengers, returnSeatIds.size()})
                );
            }

            for (Long seatId : returnSeatIds) {
                BusSeat seat = busSeatRepository.findById(seatId)
                        .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));
                if (seat.getBus() == null || returnTrip.getBus() == null || !seat.getBus().getId().equals(returnTrip.getBus().getId())) {
                    throw new InvalidSeatException(bundleMessageService.getMessage("error.draft.seat_from_other_bus"));
                }
                if (!busBookingService.isSeatAvailable(returnTrip.getId(), seatId)) {
                    throw new SeatAlreadyBookedException(
                            bundleMessageService.getMessage("error.draft.seat_unavailable", new Object[]{seat.getSeatNumber()})
                    );
                }
            }
        }

        // 7. Fresh price recalculation against snapshot
        long nights = java.time.temporal.ChronoUnit.DAYS.between(draft.getCheckIn(), draft.getCheckOut());
        BigDecimal recalculatedHotelTotal = BigDecimal.ZERO;
        for (Room room : rooms) {
            BigDecimal roomTotal = BigDecimal.valueOf(room.getPricePerNight()).multiply(BigDecimal.valueOf(nights));
            recalculatedHotelTotal = recalculatedHotelTotal.add(roomTotal);
        }

        BigDecimal recalculatedGoingPrice = BigDecimal.ZERO;
        if (goingTrip != null && !goingSeatIds.isEmpty()) {
            BigDecimal pricePerSeat = pricingService.calculateBusTripPrice(goingTrip).getTotal();
            recalculatedGoingPrice = pricePerSeat.multiply(BigDecimal.valueOf(goingSeatIds.size()));
        }

        BigDecimal recalculatedReturnPrice = BigDecimal.ZERO;
        if (returnTrip != null && !returnSeatIds.isEmpty()) {
            BigDecimal pricePerSeat = pricingService.calculateBusTripPrice(returnTrip).getTotal();
            recalculatedReturnPrice = pricePerSeat.multiply(BigDecimal.valueOf(returnSeatIds.size()));
        }

        BigDecimal recalculatedTotal = recalculatedHotelTotal.add(recalculatedGoingPrice).add(recalculatedReturnPrice);
        if (recalculatedTotal.compareTo(draft.getTotalPrice()) != 0) {
            draft.setTotalPrice(recalculatedTotal);
            draft.setHotelTotal(recalculatedHotelTotal);
            draft.setGoingTransportPrice(recalculatedGoingPrice);
            draft.setReturnTransportPrice(recalculatedReturnPrice);
            bookingDraftRepository.save(draft);
            throw new PriceChangedException(bundleMessageService.getMessage("error.price_changed"), recalculatedTotal);
        }

        // 8. Create all bookings in ONE atomic transaction
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));
        Hotel hotel = rooms.get(0).getHotel();

        // Hotel booking
        HotelBooking hotelBooking = new HotelBooking();
        hotelBooking.setUser(user);
        hotelBooking.setHotel(hotel);
        hotelBooking.setRoom(rooms.get(0)); // Backward compatibility
        hotelBooking.setCheckIn(draft.getCheckIn());
        hotelBooking.setCheckOut(draft.getCheckOut());
        hotelBooking.setGuests(draft.getGuests());
        hotelBooking.setTotalPrice(recalculatedHotelTotal);
        hotelBooking.setStatus(BookingStatus.PENDING);
        HotelBooking savedHotelBooking = hotelBookingRepository.save(hotelBooking);

        List<HotelBookingRoom> bookingRooms = new ArrayList<>();
        for (Room room : rooms) {
            HotelBookingRoom bookingRoom = new HotelBookingRoom();
            bookingRoom.setHotelBooking(savedHotelBooking);
            bookingRoom.setRoom(room);
            bookingRoom.setPricePerNight(room.getPricePerNight());
            bookingRooms.add(hotelBookingRoomRepository.save(bookingRoom));
        }
        savedHotelBooking.setBookingRooms(bookingRooms);
        draft.setConfirmedBookingId(savedHotelBooking.getId());

        // Bus bookings: one row PER seat
        List<Long> busBookingIds = new ArrayList<>();
        if (goingTrip != null) {
            BigDecimal pricePerSeat = pricingService.calculateBusTripPrice(goingTrip).getTotal();
            for (Long seatId : goingSeatIds) {
                BusSeat seat = busSeatRepository.findById(seatId).orElseThrow();
                BusBooking busBooking = new BusBooking();
                busBooking.setUser(user);
                busBooking.setBusTrip(goingTrip);
                busBooking.setSeat(seat);
                busBooking.setStatus(BookingStatus.PENDING);
                busBooking.setBookingDate(LocalDate.now(CAIRO_ZONE));
                busBooking.setPrice(pricePerSeat);
                BusBooking savedBb = busBookingRepository.save(busBooking);
                busBookingIds.add(savedBb.getId());
            }
        }

        if (returnTrip != null) {
            BigDecimal pricePerSeat = pricingService.calculateBusTripPrice(returnTrip).getTotal();
            for (Long seatId : returnSeatIds) {
                BusSeat seat = busSeatRepository.findById(seatId).orElseThrow();
                BusBooking busBooking = new BusBooking();
                busBooking.setUser(user);
                busBooking.setBusTrip(returnTrip);
                busBooking.setSeat(seat);
                busBooking.setStatus(BookingStatus.PENDING);
                busBooking.setBookingDate(LocalDate.now(CAIRO_ZONE));
                busBooking.setPrice(pricePerSeat);
                BusBooking savedBb = busBookingRepository.save(busBooking);
                busBookingIds.add(savedBb.getId());
            }
        }

        // Payments
        PaymentRequestDto hpRequest = new PaymentRequestDto();
        hpRequest.setAmount(recalculatedHotelTotal);
        hpRequest.setPaymentMethod(PaymentMethod.CREDIT_CARD);
        hpRequest.setPaymentStatus(PaymentStatus.PENDING);
        hpRequest.setTransactionDate(LocalDateTime.now());
        hpRequest.setHotelBookingId(savedHotelBooking.getId());
        paymentService.createPayment(hpRequest);

        for (Long bbId : busBookingIds) {
            BusBooking bb = busBookingRepository.findById(bbId).orElseThrow();
            PaymentRequestDto bpRequest = new PaymentRequestDto();
            bpRequest.setAmount(bb.getPrice());
            bpRequest.setPaymentMethod(PaymentMethod.CREDIT_CARD);
            bpRequest.setPaymentStatus(PaymentStatus.PENDING);
            bpRequest.setTransactionDate(LocalDateTime.now());
            bpRequest.setBusBookingId(bbId);
            paymentService.createPayment(bpRequest);
        }

        // Mark draft confirmed
        draft.setStatus(DraftStatus.CONFIRMED);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            draft.setIdempotencyKey(idempotencyKey);
        }
        bookingDraftRepository.save(draft);

        BookingDraftResponse response = mapToResponse(draft);
        response.setBusBookingIds(busBookingIds);
        return response;
    }

    private void validateTripBookable(BusTrip trip) {
        if (trip.getStatus() != null && trip.getStatus() != BusTripStatus.SCHEDULED) {
            throw new BusTripUnavailableException(bundleMessageService.getMessage("error.trip_not_bookable"));
        }
        LocalDateTime nowCairo = LocalDateTime.now(CAIRO_ZONE);
        if (trip.getDepartureTime() != null && trip.getDepartureTime().isBefore(nowCairo)) {
            throw new BusTripUnavailableException(bundleMessageService.getMessage("error.trip_departed"));
        }
    }

    private BookingDraftResponse mapToResponse(BookingDraft draft) {
        List<DraftRoomSnapshotDto> roomDtos = new ArrayList<>();
        if (draft.getRooms() != null && !draft.getRooms().isEmpty()) {
            for (DraftRoomSnapshot r : draft.getRooms()) {
                roomDtos.add(DraftRoomSnapshotDto.builder()
                        .roomId(r.getRoomId())
                        .roomNumber(r.getRoomNumber())
                        .roomType(r.getRoomType())
                        .capacity(r.getCapacity())
                        .pricePerNight(r.getPricePerNight())
                        .build());
            }
        } else if (draft.getRoomId() != null) {
            roomDtos.add(DraftRoomSnapshotDto.builder()
                    .roomId(draft.getRoomId())
                    .roomNumber(draft.getRoomNumber())
                    .roomType(null)
                    .capacity(draft.getRoomCapacity())
                    .pricePerNight(draft.getRoomPricePerNight())
                    .build());
        }

        List<DraftSeatSnapshotDto> goingSeatDtos = new ArrayList<>();
        if (draft.getGoingSeats() != null && !draft.getGoingSeats().isEmpty()) {
            for (DraftSeatSnapshot s : draft.getGoingSeats()) {
                goingSeatDtos.add(DraftSeatSnapshotDto.builder()
                        .seatId(s.getSeatId())
                        .seatNumber(s.getSeatNumber())
                        .seatType(s.getSeatType())
                        .build());
            }
        } else if (draft.getOutgoingSeatId() != null) {
            goingSeatDtos.add(DraftSeatSnapshotDto.builder()
                    .seatId(draft.getOutgoingSeatId())
                    .seatNumber(draft.getGoingSeatNumber())
                    .seatType(draft.getGoingSeatType())
                    .build());
        }

        List<DraftSeatSnapshotDto> returnSeatDtos = new ArrayList<>();
        if (draft.getReturnSeats() != null && !draft.getReturnSeats().isEmpty()) {
            for (DraftSeatSnapshot s : draft.getReturnSeats()) {
                returnSeatDtos.add(DraftSeatSnapshotDto.builder()
                        .seatId(s.getSeatId())
                        .seatNumber(s.getSeatNumber())
                        .seatType(s.getSeatType())
                        .build());
            }
        } else if (draft.getReturnSeatId() != null) {
            returnSeatDtos.add(DraftSeatSnapshotDto.builder()
                    .seatId(draft.getReturnSeatId())
                    .seatNumber(draft.getReturnSeatNumber())
                    .seatType(draft.getReturnSeatType())
                    .build());
        }

        long nights = (draft.getCheckIn() != null && draft.getCheckOut() != null)
                ? java.time.temporal.ChronoUnit.DAYS.between(draft.getCheckIn(), draft.getCheckOut())
                : 0;

        return BookingDraftResponse.builder()
                .id(draft.getId())
                .status(draft.getStatus())
                .expiresAt(draft.getExpiresAt())
                .hotelId(draft.getHotelId())
                .hotelName(draft.getHotelName())
                // Legacy single-room info
                .roomId(draft.getRoomId())
                .roomNumber(draft.getRoomNumber())
                .roomCapacity(draft.getRoomCapacity())
                .pricePerNight(draft.getRoomPricePerNight())
                // Multi-room info
                .roomIds(draft.getRoomIds())
                .rooms(roomDtos)
                // Dates and occupants
                .checkInDate(draft.getCheckIn())
                .checkOutDate(draft.getCheckOut())
                .nights(nights)
                .guests(draft.getGuests())
                .adults(draft.getAdults() != null ? draft.getAdults() : draft.getGuests())
                .childAges(draft.getChildAges() != null ? draft.getChildAges() : Collections.emptyList())
                .transportPassengers(draft.getTransportPassengers())
                // Going trip
                .goingTripId(draft.getOutgoingTripId())
                .goingSeatId(draft.getOutgoingSeatId())
                .goingSeatNumber(draft.getGoingSeatNumber())
                .goingSeatType(draft.getGoingSeatType())
                .goingTripPrice(draft.getGoingTripPrice())
                .goingTripOrigin(draft.getGoingTripOrigin())
                .goingTripDestination(draft.getGoingTripDestination())
                .goingTripDepartureTime(draft.getGoingTripDepartureTime())
                .goingTripArrivalTime(draft.getGoingTripArrivalTime())
                .goingSeatIds(draft.getOutgoingSeatIds())
                .goingSeats(goingSeatDtos)
                // Return trip
                .returnTripId(draft.getReturnTripId())
                .returnSeatId(draft.getReturnSeatId())
                .returnSeatNumber(draft.getReturnSeatNumber())
                .returnSeatType(draft.getReturnSeatType())
                .returnTripPrice(draft.getReturnTripPrice())
                .returnTripOrigin(draft.getReturnTripOrigin())
                .returnTripDestination(draft.getReturnTripDestination())
                .returnTripDepartureTime(draft.getReturnTripDepartureTime())
                .returnTripArrivalTime(draft.getReturnTripArrivalTime())
                .returnSeatIds(draft.getReturnSeatIds())
                .returnSeats(returnSeatDtos)
                // Pricing breakdown
                .hotelTotal(draft.getHotelTotal())
                .goingTransportPrice(draft.getGoingTransportPrice())
                .returnTransportPrice(draft.getReturnTransportPrice())
                .totalPrice(draft.getTotalPrice())
                .bookingId(draft.getConfirmedBookingId())
                .build();
    }

    @Override
    public BookingDraftRepository getBookingDraftRepository() {
        return bookingDraftRepository;
    }

    @Override
    public void expireOldDrafts() {
        List<BookingDraft> expiredDrafts = bookingDraftRepository.findByExpiresAtBeforeAndStatusIn(
                LocalDateTime.now(),
                List.of(DraftStatus.CREATED)
        );
        for (BookingDraft draft : expiredDrafts) {
            draft.setStatus(DraftStatus.EXPIRED);
            bookingDraftRepository.save(draft);
        }
    }

    @Override
    public void deleteDraft(Long id) {
        bookingDraftRepository.deleteById(id);
    }

    @Override
    public BookingDraft updateDraft(BookingDraft draft) {
        return bookingDraftRepository.save(draft);
    }
}
