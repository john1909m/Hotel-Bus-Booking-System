package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.exception.InvalidBookingDatesException;
import com.spring.boot.exception.InvalidGuestCountException;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.exception.RoomUnavailableException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.helper.SecurityUtils;
import com.spring.boot.mapper.HotelBookingMapper;
import com.spring.boot.model.Hotel;
import com.spring.boot.model.HotelBooking;
import com.spring.boot.model.HotelBookingRoom;
import com.spring.boot.model.Room;
import com.spring.boot.model.User;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.repository.HotelBookingRoomRepository;
import com.spring.boot.repository.HotelRepository;
import com.spring.boot.repository.RoomRepository;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.interfaces.HotelBookingService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service implementation for HotelBooking entity.
 */
@Service
@AllArgsConstructor
public class HotelBookingServiceImpl implements HotelBookingService {

    private static final Map<BookingStatus, Set<BookingStatus>> ALLOWED_BOOKING_TRANSITIONS = Map.of(
            BookingStatus.PENDING, Set.of(BookingStatus.CONFIRMED, BookingStatus.CANCELLED),
            BookingStatus.CONFIRMED, Set.of(BookingStatus.COMPLETED, BookingStatus.CANCELLED),
            BookingStatus.COMPLETED, Collections.emptySet(),
            BookingStatus.CANCELLED, Collections.emptySet()
    );

    private final HotelBookingRepository hotelBookingRepository;
    private final HotelBookingRoomRepository hotelBookingRoomRepository;
    private final HotelBookingMapper hotelBookingMapper;
    private final RoomRepository roomRepository;
    private final HotelRepository hotelRepository;
    private final UserRepository userRepository;
    private final BundleMessageService bundleMessageService;

    public void validateStatusTransition(BookingStatus current, BookingStatus requested) {
        if (requested == null || current == requested) {
            return;
        }
        Set<BookingStatus> allowed = ALLOWED_BOOKING_TRANSITIONS.getOrDefault(current, Collections.emptySet());
        if (!allowed.contains(requested)) {
            throw new BookingConflictException(
                    bundleMessageService.getMessage("error.booking.invalid_status_transition", new Object[]{current, requested})
            );
        }
    }

    @Override
    @Transactional
    public HotelBookingDto createHotelBooking(HotelBookingRequestDto hotelBookingRequestDto, Long userId) {
        // Validate dates
        if (hotelBookingRequestDto.getCheckOut().isBefore(hotelBookingRequestDto.getCheckIn()) ||
                hotelBookingRequestDto.getCheckOut().isEqual(hotelBookingRequestDto.getCheckIn())) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_out_before_check_in"));
        }

        // Validate user exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.user_not_found")));

        // Resolve room IDs: prefer roomIds list, fallback to roomId
        List<Long> requestedRoomIds = hotelBookingRequestDto.getRoomIds();
        if (requestedRoomIds == null || requestedRoomIds.isEmpty()) {
            if (hotelBookingRequestDto.getRoomId() != null) {
                requestedRoomIds = List.of(hotelBookingRequestDto.getRoomId());
            } else {
                throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found"));
            }
        }

        // No duplicate room ids in the request
        Set<Long> uniqueIds = new HashSet<>(requestedRoomIds);
        if (uniqueIds.size() != requestedRoomIds.size()) {
            throw new BookingConflictException(bundleMessageService.getMessage("error.duplicate_rooms"));
        }

        // Lock rooms in ascending ID order to prevent deadlocks and serialize concurrent booking attempts
        List<Long> sortedRoomIds = requestedRoomIds.stream().sorted().toList();
        List<Room> rooms = roomRepository.findAllByIdsForUpdate(sortedRoomIds);
        if (rooms.size() != sortedRoomIds.size()) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found"));
        }

        // All room ids belong to the SAME hotel as the booking
        Long hotelId = rooms.get(0).getHotel().getId();
        for (Room room : rooms) {
            if (!room.getHotel().getId().equals(hotelId)) {
                throw new BookingConflictException(bundleMessageService.getMessage("error.rooms_different_hotels"));
            }
        }
        Hotel hotel = rooms.get(0).getHotel();

        // Every room is available for the given dates
        for (Room room : rooms) {
            if (!isRoomAvailable(hotelId,
                    hotelBookingRequestDto.getCheckIn(),
                    hotelBookingRequestDto.getCheckOut(),
                    room.getId())) {
                throw new RoomUnavailableException(bundleMessageService.getMessage("error.room_named_not_available", new Object[]{room.getRoomNumber()}));
            }
        }

        // Total guests capacity: sum of capacities of selected rooms >= required capacity (free under 12 rule)
        int totalCapacity = rooms.stream().mapToInt(Room::getCapacity).sum();
        validateRoomCapacity(totalCapacity,
                hotelBookingRequestDto.getAdults(),
                hotelBookingRequestDto.getChildAges(),
                hotelBookingRequestDto.getGuests());

        int effectiveAdults = hotelBookingRequestDto.getAdults() != null
                ? hotelBookingRequestDto.getAdults()
                : hotelBookingRequestDto.getGuests();
        List<Integer> effectiveChildAges = hotelBookingRequestDto.getChildAges() != null
                ? hotelBookingRequestDto.getChildAges()
                : Collections.emptyList();
        int totalOccupants = effectiveAdults + effectiveChildAges.size();

        // totalPrice = sum over rooms of (nights * room.pricePerNight)
        long nights = java.time.temporal.ChronoUnit.DAYS.between(
                hotelBookingRequestDto.getCheckIn(),
                hotelBookingRequestDto.getCheckOut());
        BigDecimal totalPrice = BigDecimal.ZERO;
        for (Room room : rooms) {
            BigDecimal roomTotal = BigDecimal.valueOf(room.getPricePerNight()).multiply(BigDecimal.valueOf(nights));
            totalPrice = totalPrice.add(roomTotal);
        }

        // Map DTO to entity
        HotelBooking hotelBooking = hotelBookingMapper.hotelBookingRequestDtoToHotelBooking(hotelBookingRequestDto);
        hotelBooking.setUser(user);
        hotelBooking.setHotel(hotel);
        hotelBooking.setRoom(rooms.get(0)); // Set first room for backward compatibility
        hotelBooking.setTotalPrice(totalPrice);
        hotelBooking.setGuests(totalOccupants);
        hotelBooking.setStatus(BookingStatus.PENDING);

        // Save booking
        HotelBooking savedHotelBooking = hotelBookingRepository.save(hotelBooking);

        // Save one HotelBookingRoom per selected room inside the SAME transaction
        List<HotelBookingRoom> bookingRooms = new ArrayList<>();
        for (Room room : rooms) {
            HotelBookingRoom bookingRoom = new HotelBookingRoom();
            bookingRoom.setHotelBooking(savedHotelBooking);
            bookingRoom.setRoom(room);
            bookingRoom.setPricePerNight(room.getPricePerNight());
            bookingRooms.add(hotelBookingRoomRepository.save(bookingRoom));
        }
        savedHotelBooking.setBookingRooms(bookingRooms);

        // Return DTO
        HotelBookingDto dto = hotelBookingMapper.hotelBookingToHotelBookingDto(savedHotelBooking);
        dto.setAdults(effectiveAdults);
        dto.setChildAges(effectiveChildAges);
        dto.setGuests(totalOccupants);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public HotelBookingDto getHotelBookingById(Long id) {
        HotelBooking hotelBooking = hotelBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(hotelBooking.getUser() != null ? hotelBooking.getUser().getId() : null)) {
            // For reads: return 404 (do not reveal existence)
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found"));
        }

        return hotelBookingMapper.hotelBookingToHotelBookingDto(hotelBooking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelBookingDto> getAllHotelBookings() {
        return hotelBookingRepository.findAll().stream()
                .map(hotelBookingMapper::hotelBookingToHotelBookingDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelBookingDto> getHotelBookingsByUserId(Long userId) {
        if (!SecurityUtils.isOwnerOrAdmin(userId)) {
            return Collections.emptyList();
        }
        return hotelBookingRepository.findByUser_Id(userId).stream()
                .map(hotelBookingMapper::hotelBookingToHotelBookingDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelBookingDto> getHotelBookingsByHotelId(Long hotelId) {
        return hotelBookingRepository.findByHotelId(hotelId).stream()
                .map(hotelBookingMapper::hotelBookingToHotelBookingDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelBookingDto> getAllHotelBookingsPaginated(Pageable pageable,
                                                              BookingStatus status,
                                                              LocalDate checkInAfter, LocalDate checkInBefore,
                                                              Long userId, Long hotelId) {
        Page<HotelBooking> hotelBookingPage = hotelBookingRepository.findByFilters(
                status,
                checkInAfter,
                checkInBefore,
                userId == null ? 0L : userId,
                hotelId == null ? 0L : hotelId,
                pageable
        );

        return hotelBookingPage.map(hotelBookingMapper::hotelBookingToHotelBookingDto);
    }

    @Override
    @Transactional
    public HotelBookingDto updateHotelBooking(Long id, HotelBookingRequestDto hotelBookingRequestDto) {
        HotelBooking existingHotelBooking = hotelBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(existingHotelBooking.getUser() != null ? existingHotelBooking.getUser().getId() : null)) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        // Validate status transition if status is being updated
        if (hotelBookingRequestDto.getStatus() != null && hotelBookingRequestDto.getStatus() != existingHotelBooking.getStatus()) {
            validateStatusTransition(existingHotelBooking.getStatus(), hotelBookingRequestDto.getStatus());
            existingHotelBooking.setStatus(hotelBookingRequestDto.getStatus());
        }

        // Validate dates
        if (hotelBookingRequestDto.getCheckOut().isBefore(hotelBookingRequestDto.getCheckIn()) ||
                hotelBookingRequestDto.getCheckOut().isEqual(hotelBookingRequestDto.getCheckIn())) {
            throw new InvalidBookingDatesException(bundleMessageService.getMessage("error.check_out_before_check_in"));
        }

        List<Long> requestedRoomIds = hotelBookingRequestDto.getRoomIds();
        if ((requestedRoomIds == null || requestedRoomIds.isEmpty()) && hotelBookingRequestDto.getRoomId() != null) {
            requestedRoomIds = List.of(hotelBookingRequestDto.getRoomId());
        }

        List<Room> rooms = new ArrayList<>();
        if (requestedRoomIds != null && !requestedRoomIds.isEmpty()) {
            Set<Long> uniqueIds = new HashSet<>(requestedRoomIds);
            if (uniqueIds.size() != requestedRoomIds.size()) {
                throw new BookingConflictException(bundleMessageService.getMessage("error.duplicate_rooms"));
            }

            // Lock rooms in ascending ID order
            List<Long> sortedRoomIds = requestedRoomIds.stream().sorted().toList();
            rooms = roomRepository.findAllByIdsForUpdate(sortedRoomIds);
            if (rooms.size() != sortedRoomIds.size()) {
                throw new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found"));
            }

            Long hotelId = rooms.get(0).getHotel().getId();
            for (Room r : rooms) {
                if (!r.getHotel().getId().equals(hotelId)) {
                    throw new BookingConflictException(bundleMessageService.getMessage("error.rooms_different_hotels"));
                }
                if (!isRoomAvailableExcludingSelf(r.getId(),
                        hotelBookingRequestDto.getCheckIn(),
                        hotelBookingRequestDto.getCheckOut(),
                        hotelId,
                        id)) {
                    throw new RoomUnavailableException(bundleMessageService.getMessage("error.room_named_not_available", new Object[]{r.getRoomNumber()}));
                }
            }
        } else {
            if (existingHotelBooking.getBookingRooms() != null && !existingHotelBooking.getBookingRooms().isEmpty()) {
                rooms = existingHotelBooking.getBookingRooms().stream().map(HotelBookingRoom::getRoom).toList();
            } else if (existingHotelBooking.getRoom() != null) {
                rooms = List.of(existingHotelBooking.getRoom());
            }
        }

        if (!rooms.isEmpty()) {
            int totalCapacity = rooms.stream().mapToInt(Room::getCapacity).sum();
            validateRoomCapacity(totalCapacity,
                    hotelBookingRequestDto.getAdults(),
                    hotelBookingRequestDto.getChildAges(),
                    hotelBookingRequestDto.getGuests() != null ? hotelBookingRequestDto.getGuests() : existingHotelBooking.getGuests());
        }

        int effectiveAdults = hotelBookingRequestDto.getAdults() != null
                ? hotelBookingRequestDto.getAdults()
                : (hotelBookingRequestDto.getGuests() != null ? hotelBookingRequestDto.getGuests() : existingHotelBooking.getGuests());
        List<Integer> effectiveChildAges = hotelBookingRequestDto.getChildAges() != null
                ? hotelBookingRequestDto.getChildAges()
                : Collections.emptyList();
        int totalOccupants = effectiveAdults + effectiveChildAges.size();

        long nights = java.time.temporal.ChronoUnit.DAYS.between(
                hotelBookingRequestDto.getCheckIn(),
                hotelBookingRequestDto.getCheckOut());
        BigDecimal totalPrice = BigDecimal.ZERO;
        for (Room r : rooms) {
            totalPrice = totalPrice.add(BigDecimal.valueOf(r.getPricePerNight()).multiply(BigDecimal.valueOf(nights)));
        }

        existingHotelBooking.setCheckIn(hotelBookingRequestDto.getCheckIn());
        existingHotelBooking.setCheckOut(hotelBookingRequestDto.getCheckOut());
        existingHotelBooking.setGuests(totalOccupants);
        existingHotelBooking.setTotalPrice(totalPrice);

        if (requestedRoomIds != null && !requestedRoomIds.isEmpty()) {
            existingHotelBooking.setRoom(rooms.get(0));
            existingHotelBooking.setHotel(rooms.get(0).getHotel());
            existingHotelBooking.getBookingRooms().clear();
            for (Room r : rooms) {
                HotelBookingRoom hbr = new HotelBookingRoom();
                hbr.setHotelBooking(existingHotelBooking);
                hbr.setRoom(r);
                hbr.setPricePerNight(r.getPricePerNight());
                existingHotelBooking.getBookingRooms().add(hbr);
            }
        }

        HotelBooking updatedHotelBooking = hotelBookingRepository.save(existingHotelBooking);
        HotelBookingDto dto = hotelBookingMapper.hotelBookingToHotelBookingDto(updatedHotelBooking);
        dto.setAdults(effectiveAdults);
        dto.setChildAges(effectiveChildAges);
        dto.setGuests(totalOccupants);
        return dto;
    }

    @Override
    @Transactional
    public HotelBookingDto updateBookingStatus(Long id, BookingStatus newStatus) {
        HotelBooking booking = hotelBookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

        validateStatusTransition(booking.getStatus(), newStatus);
        booking.setStatus(newStatus);
        HotelBooking saved = hotelBookingRepository.save(booking);
        return hotelBookingMapper.hotelBookingToHotelBookingDto(saved);
    }

    @Override
    @Transactional
    public void deleteHotelBooking(Long id) {
        HotelBooking existing = hotelBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.hotel_booking_not_found")));

        if (!SecurityUtils.isOwnerOrAdmin(existing.getUser() != null ? existing.getUser().getId() : null)) {
            throw new AccessDeniedException(bundleMessageService.getMessage("error.access_denied"));
        }

        hotelBookingRepository.delete(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelBookingDto> getMyHotelBookings(Long userId) {
        return getHotelBookingsByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isRoomAvailable(Long hotelId, LocalDate checkIn, LocalDate checkOut, Long roomId) {
        var room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));

        if (!room.getHotel().getId().equals(hotelId)) {
            return false;
        }

        return hotelBookingRepository.findOverlappingBookings(roomId, checkIn, checkOut).isEmpty();
    }

    private boolean isRoomAvailableExcludingSelf(Long roomId, LocalDate checkIn, LocalDate checkOut, Long hotelId, Long bookingId) {
        var room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.room_not_found")));

        if (!room.getHotel().getId().equals(hotelId)) {
            return false;
        }

        return hotelBookingRepository.findOverlappingBookingsExcludingSelf(roomId, checkIn, checkOut, bookingId).isEmpty();
    }

    @Override
    public int calculateRequiredCapacity(Integer adults, List<Integer> childAges, Integer fallbackGuests) {
        Integer effectiveAdults = adults;
        if (effectiveAdults == null) {
            effectiveAdults = fallbackGuests;
        }

        if (effectiveAdults == null || effectiveAdults < 1) {
            throw new InvalidGuestCountException(bundleMessageService.getMessage("error.invalid_adults"));
        }

        int count12Plus = 0;
        if (childAges != null) {
            for (Integer age : childAges) {
                if (age == null || age < 0 || age > 17) {
                    throw new InvalidGuestCountException(bundleMessageService.getMessage("error.invalid_child_age"));
                }
                if (age >= 12) {
                    count12Plus++;
                }
            }
        }

        return effectiveAdults + count12Plus;
    }

    @Override
    public void validateRoomCapacity(int totalCapacity, Integer adults, List<Integer> childAges, Integer fallbackGuests) {
        int required = calculateRequiredCapacity(adults, childAges, fallbackGuests);
        if (required > totalCapacity) {
            throw new InvalidGuestCountException(bundleMessageService.getMessage("error.guest_count_exceeds_capacity"));
        }
    }
}