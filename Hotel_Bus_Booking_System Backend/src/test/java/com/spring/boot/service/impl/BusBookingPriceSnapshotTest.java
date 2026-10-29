package com.spring.boot.service.impl;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.dto.BusTripPriceBreakdownDto;
import com.spring.boot.dto.UserDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.enums.Role;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.mapper.BusBookingMapper;
import com.spring.boot.model.Bus;
import com.spring.boot.model.BusBooking;
import com.spring.boot.model.BusSeat;
import com.spring.boot.model.BusTrip;
import com.spring.boot.model.User;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusSeatRepository;
import com.spring.boot.repository.BusTripRepository;
import com.spring.boot.repository.UserRepository;
import com.spring.boot.service.interfaces.PricingService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusBookingPriceSnapshotTest {

    @Mock
    private BusBookingRepository busBookingRepository;

    @Mock
    private BusBookingMapper busBookingMapper;

    @Mock
    private BusTripRepository busTripRepository;

    @Mock
    private BusSeatRepository busSeatRepository;

    @Mock
    private BusRepository busRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BundleMessageService bundleMessageService;

    @Mock
    private PricingService pricingService;

    @InjectMocks
    private BusBookingServiceImpl busBookingService;

    private User user;
    private Bus bus;
    private BusSeat seat;
    private BusTrip trip;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));

        user = new User();
        user.setId(10L);
        user.setEmail("test@travel.com");
        user.setRole(Role.USER);

        UserDto userDto = new UserDto();
        userDto.setId(10L);
        userDto.setEmail("test@travel.com");
        userDto.setRole(Role.USER);

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDto, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        bus = new Bus();
        bus.setId(1L);
        bus.setPriceFactor(new BigDecimal("1.25"));

        seat = new BusSeat();
        seat.setId(5L);
        seat.setSeatNumber("3A");
        seat.setBus(bus);

        trip = new BusTrip();
        trip.setId(100L);
        trip.setBus(bus);
        trip.setStatus(BusTripStatus.SCHEDULED);
        trip.setDepartureTime(LocalDateTime.now().plusDays(3));
        trip.setPrice(new BigDecimal("100.00"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Verification 1 & 2: Pricing snapshot on booking creation, ignores client price, and changing factor later preserves snapshot")
    void testBookingPriceSnapshotRule() {
        // Mock repositories
        when(userRepository.existsById(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(busTripRepository.findById(100L)).thenReturn(Optional.of(trip));
        when(busTripRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(5L)).thenReturn(Optional.of(seat));
        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(eq(100L), eq(5L), any())).thenReturn(Collections.emptyList());

        // Pricing calculation returns 135.00
        when(pricingService.calculateBusTripPrice(trip)).thenReturn(
                BusTripPriceBreakdownDto.builder().total(new BigDecimal("135.00")).build()
        );

        BusBooking mappedEntity = new BusBooking();
        when(busBookingMapper.busBookingRequestDtoToBusBooking(any())).thenReturn(mappedEntity);

        when(busBookingRepository.save(any(BusBooking.class))).thenAnswer(inv -> {
            BusBooking b = inv.getArgument(0);
            b.setId(999L);
            return b;
        });

        when(busBookingMapper.busBookingToBusBookingDto(any())).thenAnswer(inv -> {
            BusBooking b = inv.getArgument(0);
            BusBookingDto dto = new BusBookingDto();
            dto.setId(b.getId());
            dto.setPrice(b.getPrice());
            return dto;
        });

        // Client attempts to send a tampering price of 10.00
        BusBookingRequestDto request = new BusBookingRequestDto();
        request.setBusTripId(100L);
        request.setSeatId(5L);
        request.setBookingDate(LocalDate.now());
        request.setPrice(new BigDecimal("10.00"));

        BusBookingDto created = busBookingService.createBusBooking(request);

        // Assert snapshot price is 135.00 (tampering client price 10.00 ignored)
        assertNotNull(created);
        assertEquals(new BigDecimal("135.00"), created.getPrice());

        // Verification 2: Changing bus priceFactor to 1.50 after booking
        bus.setPriceFactor(new BigDecimal("1.50"));

        // When existing booking is loaded for update without changing trip or seat
        BusBooking existingBooking = new BusBooking();
        existingBooking.setId(999L);
        existingBooking.setBusTrip(trip);
        existingBooking.setSeat(seat);
        existingBooking.setUser(user);
        existingBooking.setPrice(new BigDecimal("135.00")); // stored snapshot
        existingBooking.setStatus(BookingStatus.CONFIRMED);

        when(busBookingRepository.findById(999L)).thenReturn(Optional.of(existingBooking));

        // Update request with same trip and seat, only updating date or client price
        BusBookingRequestDto updateRequest = new BusBookingRequestDto();
        updateRequest.setBusTripId(100L);
        updateRequest.setSeatId(5L);
        updateRequest.setBookingDate(LocalDate.now().plusDays(1));
        updateRequest.setPrice(new BigDecimal("500.00")); // should be ignored

        BusBookingDto updated = busBookingService.updateBusBooking(999L, updateRequest);

        // Snapshot rule: existing price of 135.00 is strictly preserved!
        assertEquals(new BigDecimal("135.00"), updated.getPrice());
        verify(pricingService, times(1)).calculateBusTripPrice(trip); // was NOT called again during update
    }
}
