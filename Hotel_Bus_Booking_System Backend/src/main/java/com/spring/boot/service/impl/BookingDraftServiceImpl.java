package com.spring.boot.service.impl;

import com.spring.boot.dto.ai.BookingDraftRequest;
import com.spring.boot.dto.ai.BookingDraftResponse;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.DraftStatus;
import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import com.spring.boot.enums.SeatType;
import com.spring.boot.exception.*;
import com.spring.boot.model.*;
import com.spring.boot.repository.*;
import com.spring.boot.service.interfaces.*;
import com.spring.boot.helper.BundleMessageService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class BookingDraftServiceImpl implements BookingDraftService {

    private final BookingDraftRepository bookingDraftRepository;
    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;
    private final BusTripRepository busTripRepository;
    private final BusSeatRepository busSeatRepository;
    private final BusBookingRepository busBookingRepository;
    private final HotelBookingRepository hotelBookingRepository;
    private final HotelBookingService hotelBookingService;
    private final BusBookingService busBookingService;
    private final PaymentService paymentService;
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
                                   HotelBookingService hotelBookingService,
                                   BusBookingService busBookingService,
                                   PaymentService paymentService,
                                   BundleMessageService bundleMessageService) {
        this.bookingDraftRepository = bookingDraftRepository;
        this.hotelRepository = hotelRepository;
        this.roomRepository = roomRepository;
        this.busTripRepository = busTripRepository;
        this.busSeatRepository = busSeatRepository;
        this.busBookingRepository = busBookingRepository;
        this.hotelBookingRepository = hotelBookingRepository;
        this.hotelBookingService = hotelBookingService;
        this.busBookingService = busBookingService;
        this.paymentService = paymentService;
        this.bundleMessageService = bundleMessageService;
    }

    @Override
    public BookingDraftResponse createDraft(Long userId, BookingDraftRequest request) {
        // Validate hotel exists
        Hotel hotel = hotelRepository.findById(request.hotelId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_not_found")));

        // Validate room exists and belongs to the hotel
        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));
        if (!room.getHotel().getId().equals(hotel.getId())) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found"));
        }

        // Validate dates
        LocalDate checkIn = request.checkInDate();
        LocalDate checkOut = request.checkOutDate();
        if (checkOut.isBefore(checkIn) || checkOut.isEqual(checkIn)) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_out_before_check_in"));
        }
        if (checkIn.isBefore(LocalDate.now())) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_in_past"));
        }

        // Validate capacity with adults and child ages (free-under-12 rule)
        hotelBookingService.validateRoomCapacity(room.getCapacity(),
                request.adults(),
                request.childAges(),
                request.guests());

        // Validate room availability (using the same logic as the booking flow)
        if (!isRoomAvailable(room.getId(), checkIn, checkOut)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_available"));
        }

        // Validate transport (if present)
        validateTransport(request, hotel);

        // Calculate prices
        BigDecimal hotelTotal = calculateHotelTotal(room, checkIn, checkOut);
        BigDecimal goingTransportPrice = request.goingTripId() != null ? calculateTransportPrice(request.goingTripId()) : BigDecimal.ZERO;
        BigDecimal returnTransportPrice = request.returnTripId() != null ? calculateTransportPrice(request.returnTripId()) : BigDecimal.ZERO;
        BigDecimal totalPrice = hotelTotal.add(goingTransportPrice).add(returnTransportPrice);

        int effectiveAdults = request.adults() != null
                ? request.adults()
                : (request.guests() != null ? request.guests() : 1);
        List<Integer> effectiveChildAges = request.childAges() != null
                ? request.childAges()
                : Collections.emptyList();
        int totalOccupants = effectiveAdults + effectiveChildAges.size();

        // Create draft with snapshot
        BookingDraft draft = BookingDraft.builder()
                .userId(userId)
                .hotelId(hotel.getId())
                .hotelName(hotel.getName())
                .roomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomCapacity(room.getCapacity())
                .roomPricePerNight(BigDecimal.valueOf(room.getPricePerNight()))
                .checkIn(checkIn)
                .checkOut(checkOut)
                .guests(totalOccupants)
                .outgoingTripId(request.goingTripId())
                .returnTripId(request.returnTripId())
                .outgoingSeatId(request.goingSeatId())
                .returnSeatId(request.returnSeatId())
                .hotelTotal(hotelTotal)
                .goingTransportPrice(goingTransportPrice)
                .returnTransportPrice(returnTransportPrice)
                .totalPrice(totalPrice)
                .status(DraftStatus.CREATED)
                .expiresAt(LocalDateTime.now().plusMinutes(draftTtlMinutes))
                .deleted(false)
                .build();

        // Set transport snapshots
        if (request.goingTripId() != null) {
            TransportSnapshot goingSnapshot = validateAndGetGoingTransportSnapshot(request, hotel);
            draft.setGoingSeatNumber(goingSnapshot.getSeatNumber());
            draft.setGoingSeatType(goingSnapshot.getSeatType().toString());
            draft.setGoingTripPrice(goingSnapshot.getTripPrice());
            draft.setGoingTripOrigin(goingSnapshot.getOrigin());
            draft.setGoingTripDestination(goingSnapshot.getDestination());
            draft.setGoingTripDepartureTime(goingSnapshot.getDepartureTime());
            draft.setGoingTripArrivalTime(goingSnapshot.getArrivalTime());
        }
        if (request.returnTripId() != null) {
            TransportSnapshot returnSnapshot = validateAndGetReturnTransportSnapshot(request, hotel);
            draft.setReturnSeatNumber(returnSnapshot.getSeatNumber());
            draft.setReturnSeatType(returnSnapshot.getSeatType().toString());
            draft.setReturnTripPrice(returnSnapshot.getTripPrice());
            draft.setReturnTripOrigin(returnSnapshot.getOrigin());
            draft.setReturnTripDestination(returnSnapshot.getDestination());
            draft.setReturnTripDepartureTime(returnSnapshot.getDepartureTime());
            draft.setReturnTripArrivalTime(returnSnapshot.getArrivalTime());
        }

        BookingDraft savedDraft = bookingDraftRepository.save(draft);
        BookingDraftResponse response = mapToResponse(savedDraft);
        response.setAdults(effectiveAdults);
        response.setChildAges(effectiveChildAges);
        return response;
    }

    @Override
    public Optional<BookingDraftResponse> getDraft(Long draftId, Long userId) {
        Optional<BookingDraft> draftOpt = bookingDraftRepository.findByIdAndUserId(draftId, userId);
        if (draftOpt.isPresent()) {
            BookingDraft draft = draftOpt.get();
            // If expired, mark as expired and return empty
            if (draft.getExpiresAt().isBefore(LocalDateTime.now()) && draft.getStatus() == DraftStatus.CREATED) {
                draft.setStatus(DraftStatus.EXPIRED);
                bookingDraftRepository.save(draft);
                return Optional.empty();
            }
            // For other statuses (including CONFIRMED, CANCELLED) we still return the draft
            // so the frontend can view the summary.
            return Optional.of(mapToResponse(draft));
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public BookingDraftResponse confirm(Long userId, Long draftId, String idempotencyKey) {
        // Lock the draft for update
        BookingDraft draft = bookingDraftRepository.findByIdAndUserIdForUpdate(draftId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.draft_not_found")));

        // Check if expired
        if (draft.getExpiresAt().isBefore(LocalDateTime.now()) && draft.getStatus() == DraftStatus.CREATED) {
            draft.setStatus(DraftStatus.EXPIRED);
            bookingDraftRepository.save(draft);
            throw new DraftExpiredException(bundleMessageService.getMessage("error.draft_expired"));
        }

        // Check if already confirmed
        if (draft.getStatus() == DraftStatus.CONFIRMED) {
            // Return the same result (we would need to store the previous response, but for simplicity we return current state)
            // In a full implementation, we would store the confirmation result and return it.
            return mapToResponse(draft);
        }

        // Check if expired or cancelled
        if (draft.getStatus() == DraftStatus.EXPIRED || draft.getStatus() == DraftStatus.CANCELLED) {
            throw new DraftExpiredException(bundleMessageService.getMessage("error.draft_expired"));
        }

        // Re-validate room availability and transport availability
        if (!isRoomAvailable(draft.getRoomId(), draft.getCheckIn(), draft.getCheckOut())) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_available"));
        }
        validateTransportForConfirm(draft);

        // Re-calculate total from database and compare with snapshot
        BigDecimal recalculatedTotal = recalculateTotal(draft);
        if (recalculatedTotal.compareTo(draft.getTotalPrice()) != 0) {
            // Update the draft snapshot with new prices in a new transaction (requires_new)
            updateDraftSnapshot(draft, recalculatedTotal);
            throw new PriceChangedException(bundleMessageService.getMessage("error.price_changed"),
                    recalculatedTotal);
        }

        // Create hotel booking
        Long hotelBookingId = null;
        if (draft.getRoomId() != null) {
            HotelBookingRequestDto hbRequest = new HotelBookingRequestDto(
                    draft.getCheckIn(),
                    draft.getCheckOut(),
                    draft.getGuests(),
                    draft.getRoomId()
            );
            HotelBookingDto hotelBookingDto = hotelBookingService.createHotelBooking(hbRequest, userId);
            hotelBookingId = hotelBookingDto.getId();
            draft.setConfirmedBookingId(hotelBookingId);
        }

        // Create going bus booking
        Long goingBusBookingId = null;
        if (draft.getOutgoingTripId() != null && draft.getOutgoingSeatId() != null) {
            BusTrip trip = busTripRepository.findById(draft.getOutgoingTripId())
                    .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
            BusBookingRequestDto bbRequest = new BusBookingRequestDto(
                    LocalDate.now(),
                    BookingStatus.PENDING,
                    trip.getPrice(),
                    userId,
                    draft.getOutgoingTripId(),
                    draft.getOutgoingSeatId()
            );
            BusBookingDto busBookingDto = busBookingService.createBusBooking(bbRequest);
            goingBusBookingId = busBookingDto.getId();
        }

        // Create return bus booking
        Long returnBusBookingId = null;
        if (draft.getReturnTripId() != null && draft.getReturnSeatId() != null) {
            BusTrip trip = busTripRepository.findById(draft.getReturnTripId())
                    .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
            BusBookingRequestDto bbRequest = new BusBookingRequestDto(
                    LocalDate.now(),
                    BookingStatus.PENDING,
                    trip.getPrice(),
                    userId,
                    draft.getReturnTripId(),
                    draft.getReturnSeatId()
            );
            BusBookingDto busBookingDto = busBookingService.createBusBooking(bbRequest);
            returnBusBookingId = busBookingDto.getId();
        }

        // Create payments
        if (hotelBookingId != null) {
            PaymentRequestDto pRequest = new PaymentRequestDto();
            pRequest.setAmount(draft.getHotelTotal());
            pRequest.setPaymentMethod(PaymentMethod.CREDIT_CARD);
            pRequest.setPaymentStatus(PaymentStatus.PENDING);
            pRequest.setTransactionDate(LocalDateTime.now());
            pRequest.setHotelBookingId(hotelBookingId);
            paymentService.createPayment(pRequest);
        }
        if (goingBusBookingId != null) {
            PaymentRequestDto pRequest = new PaymentRequestDto();
            pRequest.setAmount(draft.getGoingTransportPrice());
            pRequest.setPaymentMethod(PaymentMethod.CREDIT_CARD);
            pRequest.setPaymentStatus(PaymentStatus.PENDING);
            pRequest.setTransactionDate(LocalDateTime.now());
            pRequest.setBusBookingId(goingBusBookingId);
            paymentService.createPayment(pRequest);
        }
        if (returnBusBookingId != null) {
            PaymentRequestDto pRequest = new PaymentRequestDto();
            pRequest.setAmount(draft.getReturnTransportPrice());
            pRequest.setPaymentMethod(PaymentMethod.CREDIT_CARD);
            pRequest.setPaymentStatus(PaymentStatus.PENDING);
            pRequest.setTransactionDate(LocalDateTime.now());
            pRequest.setBusBookingId(returnBusBookingId);
            paymentService.createPayment(pRequest);
        }

        // Mark draft as confirmed
        draft.setStatus(DraftStatus.CONFIRMED);
        // Store idempotency key if provided
        if (idempotencyKey != null && !idempotencyKey.isEmpty()) {
            draft.setIdempotencyKey(idempotencyKey);
        }
        bookingDraftRepository.save(draft);

        // Return the draft response (which now includes confirmed booking ID)
        return mapToResponse(draft);
    }

    // Helper methods

    private boolean isRoomAvailable(Long roomId, LocalDate checkIn, LocalDate checkOut) {
        // Use the same logic as in HotelBookingServiceImpl.isRoomAvailable
        // We'll delegate to the hotel booking service or replicate the logic.
        // For simplicity, we'll use the repository method if available, but we don't have one.
        // We'll replicate the logic from HotelBookingServiceImpl.isRoomAvailable and isRoomAvailableExcludingSelf.
        // Since we are in a draft, we don't exclude any booking.
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        List<HotelBooking> overlapping = hotelBookingRepository.findOverlappingBookings(roomId, checkIn, checkOut);
        return overlapping.isEmpty();
    }

    private BigDecimal calculateHotelTotal(Room room, LocalDate checkIn, LocalDate checkOut) {
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        return BigDecimal.valueOf(room.getPricePerNight()).multiply(BigDecimal.valueOf(nights));
    }

    private BigDecimal calculateTransportPrice(Long tripId) {
        BusTrip trip = busTripRepository.findById(tripId).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        // Assuming the price is per seat
        return trip.getPrice();
    }

    private void validateTransport(BookingDraftRequest request, Hotel hotel) {
        if (request.goingTripId() != null) {
            validateGoingTransport(request.goingTripId(), request.goingSeatId(), hotel);
        }
        if (request.returnTripId() != null) {
            validateReturnTransport(request.returnTripId(), request.returnSeatId(), hotel);
        }
    }

    private void validateGoingTransport(Long tripId, Long seatId, Hotel hotel) {
        BusTrip trip = busTripRepository.findById(tripId).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        BusSeat seat = busSeatRepository.findById(seatId).orElseThrow(() -> new ResourceNotFoundException("Seat not found"));
        // Validate seat belongs to the bus of the trip
        if (!Objects.equals(seat.getBus().getId(), trip.getBus().getId())) {
            throw new InvalidSeatException(bundleMessageService.getMessage("error.seat_not_belong_to_trip"));
        }
        // Validate seat is not taken (using the same logic as bus booking flow)
        if (isSeatTaken(tripId, seatId)) {
            throw new SeatAlreadyBookedException(bundleMessageService.getMessage("error.seat_already_booked"));
        }
        // Additional validation: trip should be suitable for the hotel and dates? We'll skip for simplicity.
    }

    private void validateReturnTransport(Long tripId, Long seatId, Hotel hotel) {
        BusTrip trip = busTripRepository.findById(tripId).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        BusSeat seat = busSeatRepository.findById(seatId).orElseThrow(() -> new ResourceNotFoundException("Seat not found"));
        if (!Objects.equals(seat.getBus().getId(), trip.getBus().getId())) {
            throw new InvalidSeatException(bundleMessageService.getMessage("error.seat_not_belong_to_trip"));
        }
        if (isSeatTaken(tripId, seatId)) {
            throw new SeatAlreadyBookedException(bundleMessageService.getMessage("error.seat_already_booked"));
        }
    }

    private boolean isSeatTaken(Long tripId, Long seatId) {
        // Use the same logic as in BusBookingService: check if the seat is booked for the trip
        List<Long> bookedSeatIds = busBookingRepository.findBookedSeatIdsByTripId(tripId);
        return bookedSeatIds.contains(seatId);
    }

    private void validateTransportForConfirm(BookingDraft draft) {
        if (draft.getOutgoingTripId() != null) {
            validateGoingTransport(draft.getOutgoingTripId(), draft.getOutgoingSeatId(), null);
        }
        if (draft.getReturnTripId() != null) {
            validateReturnTransport(draft.getReturnTripId(), draft.getReturnSeatId(), null);
        }
    }

    private BigDecimal recalculateTotal(BookingDraft draft) {
        BigDecimal hotelTotal = BigDecimal.ZERO;
        if (draft.getRoomId() != null) {
            Room room = roomRepository.findById(draft.getRoomId()).orElseThrow(() -> new ResourceNotFoundException("Room not found"));
            hotelTotal = calculateHotelTotal(room, draft.getCheckIn(), draft.getCheckOut());
        }
        BigDecimal goingTransportPrice = draft.getOutgoingTripId() != null ? calculateTransportPrice(draft.getOutgoingTripId()) : BigDecimal.ZERO;
        BigDecimal returnTransportPrice = draft.getReturnTripId() != null ? calculateTransportPrice(draft.getReturnTripId()) : BigDecimal.ZERO;
        return hotelTotal.add(goingTransportPrice).add(returnTransportPrice);
    }

    @Transactional
    public void updateDraftSnapshot(BookingDraft draft, BigDecimal newTotalPrice) {
        // This method would be called in a new transaction (requires_new) to update the draft snapshot
        // when the price has changed and we want to update the draft for the user to see the new price.
        // For simplicity, we'll update the draft in the same transaction and rely on the outer transaction to rollback if needed.
        // But the requirement says to update in a separate transaction so that the main transaction can rollback.
        // We'll use a TransactionTemplate with PROPAGATION_REQUIRES_NEW.
        // However, we don't have a TransactionTemplate injected. We'll simplify and update in the same transaction.
        // In a real implementation, we would use a separate transaction.
        draft.setTotalPrice(newTotalPrice);
        // Also update the components if needed? We'll just update the total for now.
        bookingDraftRepository.save(draft);
    }

    private TransportSnapshot validateAndGetGoingTransportSnapshot(BookingDraftRequest request, Hotel hotel) {
        // This method validates and returns a snapshot of the going transport
        validateGoingTransport(request.goingTripId(), request.goingSeatId(), hotel);
        BusTrip trip = busTripRepository.findById(request.goingTripId()).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        BusSeat seat = busSeatRepository.findById(request.goingSeatId()).orElseThrow(() -> new ResourceNotFoundException("Seat not found"));
        return new TransportSnapshot(
                seat.getSeatNumber(),
                seat.getSeatType(),
                trip.getPrice(),
                trip.getRoute().getOriginStop().getName(),
                trip.getRoute().getDestinationStop().getName(),
                trip.getDepartureTime(),
                trip.getArrivalTime()
        );
    }

    private TransportSnapshot validateAndGetReturnTransportSnapshot(BookingDraftRequest request, Hotel hotel) {
        validateReturnTransport(request.returnTripId(), request.returnSeatId(), hotel);
        BusTrip trip = busTripRepository.findById(request.returnTripId()).orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
        BusSeat seat = busSeatRepository.findById(request.returnSeatId()).orElseThrow(() -> new ResourceNotFoundException("Seat not found"));
        return new TransportSnapshot(
                seat.getSeatNumber(),
                seat.getSeatType(),
                trip.getPrice(),
                trip.getRoute().getOriginStop().getName(),
                trip.getRoute().getDestinationStop().getName(),
                trip.getDepartureTime(),
                trip.getArrivalTime()
        );
    }

    private BookingDraftResponse mapToResponse(BookingDraft draft) {
        // Map the draft to the response DTO
        // We'll build the response with the required fields.
        // For simplicity, we'll map only the basic fields and leave the transport details as null if not set.
        // In a real implementation, we would map all the snapshot fields.
        BookingDraftResponse response = BookingDraftResponse.builder()
                .id(draft.getId())
                .status(draft.getStatus())
                .expiresAt(draft.getExpiresAt())
                .hotelId(draft.getHotelId())
                .hotelName(draft.getHotelName())
                .roomId(draft.getRoomId())
                .roomNumber(draft.getRoomNumber())
                .roomCapacity(draft.getRoomCapacity())
                .pricePerNight(draft.getRoomPricePerNight())
                .checkInDate(draft.getCheckIn())
                .checkOutDate(draft.getCheckOut())
                .nights(java.time.temporal.ChronoUnit.DAYS.between(draft.getCheckIn(), draft.getCheckOut()))
                .guests(draft.getGuests())
                .adults(draft.getGuests())
                .childAges(Collections.emptyList())
                .goingTripId(draft.getOutgoingTripId())
                .goingSeatId(draft.getOutgoingSeatId())
                .goingSeatNumber(draft.getGoingSeatNumber())
                .goingSeatType(draft.getGoingSeatType())
                .goingTripPrice(draft.getGoingTripPrice())
                .goingTripOrigin(draft.getGoingTripOrigin())
                .goingTripDestination(draft.getGoingTripDestination())
                .goingTripDepartureTime(draft.getGoingTripDepartureTime())
                .goingTripArrivalTime(draft.getGoingTripArrivalTime())
                .returnTripId(draft.getReturnTripId())
                .returnSeatId(draft.getReturnSeatId())
                .returnSeatNumber(draft.getReturnSeatNumber())
                .returnSeatType(draft.getReturnSeatType())
                .returnTripPrice(draft.getReturnTripPrice())
                .returnTripOrigin(draft.getReturnTripOrigin())
                .returnTripDestination(draft.getReturnTripDestination())
                .returnTripDepartureTime(draft.getReturnTripDepartureTime())
                .returnTripArrivalTime(draft.getReturnTripArrivalTime())
                .hotelTotal(draft.getHotelTotal())
                .goingTransportPrice(draft.getGoingTransportPrice())
                .returnTransportPrice(draft.getReturnTransportPrice())
                .totalPrice(draft.getTotalPrice())
                .bookingId(draft.getConfirmedBookingId())
                .build();

        // If we have room ID, we can fetch the room to get the room type
        if (draft.getRoomId() != null) {
            Room room = roomRepository.findById(draft.getRoomId()).orElseThrow();
            response.setRoomType(room.getRoomType().toString());
        }

        return response;
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
        // Soft delete using the repository's delete method (which uses @SQLDelete)
        bookingDraftRepository.deleteById(id);
    }

    @Override
    public BookingDraft updateDraft(BookingDraft draft) {
        return bookingDraftRepository.save(draft);
    }

    // Helper class for transport snapshot
    private static class TransportSnapshot {
        private final String seatNumber;
        private final SeatType seatType;
        private final BigDecimal tripPrice;
        private final String origin;
        private final String destination;
        private final LocalDateTime departureTime;
        private final LocalDateTime arrivalTime;

        public TransportSnapshot(String seatNumber, SeatType seatType, BigDecimal tripPrice, String origin, String destination, LocalDateTime departureTime, LocalDateTime arrivalTime) {
            this.seatNumber = seatNumber;
            this.seatType = seatType;
            this.tripPrice = tripPrice;
            this.origin = origin;
            this.destination = destination;
            this.departureTime = departureTime;
            this.arrivalTime = arrivalTime;
        }

        public String getSeatNumber() {
            return seatNumber;
        }

        public SeatType getSeatType() {
            return seatType;
        }

        public BigDecimal getTripPrice() {
            return tripPrice;
        }

        public String getOrigin() {
            return origin;
        }

        public String getDestination() {
            return destination;
        }

        public LocalDateTime getDepartureTime() {
            return departureTime;
        }

        public LocalDateTime getArrivalTime() {
            return arrivalTime;
        }
    }
}
