package com.spring.boot.service.impl;

import com.spring.boot.dto.BusBookingDto;
import com.spring.boot.dto.BusBookingRequestDto;
import com.spring.boot.dto.UserDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.BusTripStatus;
import com.spring.boot.enums.Role;
import com.spring.boot.exception.BusTripUnavailableException;
import com.spring.boot.exception.InvalidSeatException;
import com.spring.boot.exception.SeatAlreadyBookedException;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BusBookingServiceTest {

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
    private com.spring.boot.service.interfaces.PricingService pricingService;

    @InjectMocks
    private BusBookingServiceImpl busBookingService;

    private User userCustomer;
    private User userAdmin;
    private Bus bus;
    private BusSeat seat1;
    private BusSeat seat2;
    private BusSeat seatOtherBus;
    private BusTrip trip;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(bundleMessageService.getMessage(anyString(), any(Object[].class))).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            Object[] args = inv.getArgument(1);
            if (args != null && args.length > 0) {
                return key + " [" + args[0] + "]";
            }
            return key;
        });

        lenient().when(pricingService.calculateBusTripPrice(any())).thenAnswer(inv -> {
            BusTrip t = inv.getArgument(0);
            BigDecimal price = (t != null && t.getPrice() != null) ? t.getPrice() : BigDecimal.valueOf(100.00);
            return com.spring.boot.dto.BusTripPriceBreakdownDto.builder().total(price).build();
        });

        userCustomer = new User();
        userCustomer.setId(10L);
        userCustomer.setEmail("customer@test.com");
        userCustomer.setRole(Role.USER);

        userAdmin = new User();
        userAdmin.setId(1L);
        userAdmin.setEmail("admin@test.com");
        userAdmin.setRole(Role.ADMIN);

        bus = new Bus();
        bus.setId(100L);

        Bus otherBus = new Bus();
        otherBus.setId(200L);

        seat1 = new BusSeat();
        seat1.setId(501L);
        seat1.setSeatNumber("1A");
        seat1.setBus(bus);

        seat2 = new BusSeat();
        seat2.setId(502L);
        seat2.setSeatNumber("1B");
        seat2.setBus(bus);

        seatOtherBus = new BusSeat();
        seatOtherBus.setId(999L);
        seatOtherBus.setSeatNumber("99");
        seatOtherBus.setBus(otherBus);

        trip = new BusTrip();
        trip.setId(1000L);
        trip.setBus(bus);
        trip.setStatus(BusTripStatus.SCHEDULED);
        trip.setDepartureTime(LocalDateTime.now(ZoneId.of("Africa/Cairo")).plusDays(2));
        trip.setPrice(BigDecimal.valueOf(150.00));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateUser(Long id, Role role) {
        UserDto principal = new UserDto();
        principal.setId(id);
        principal.setRole(role);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void testSingleBooking_Success() {
        authenticateUser(10L, Role.USER);

        when(userRepository.existsById(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(userCustomer));
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busTripRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seat1));
        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(eq(1000L), eq(501L), eq(BusBookingRepository.ACTIVE_STATUSES)))
                .thenReturn(Collections.emptyList());

        BusBooking bookingEntity = new BusBooking();
        when(busBookingMapper.busBookingRequestDtoToBusBooking(any())).thenReturn(bookingEntity);
        when(busBookingRepository.save(any())).thenReturn(bookingEntity);
        BusBookingDto responseDto = new BusBookingDto();
        when(busBookingMapper.busBookingToBusBookingDto(any())).thenReturn(responseDto);

        BusBookingRequestDto request = new BusBookingRequestDto(
                LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 10L, 1000L, 501L
        );

        BusBookingDto result = busBookingService.createBusBooking(request);
        assertNotNull(result);
        verify(busTripRepository).findByIdForUpdate(1000L);
        verify(busBookingRepository).save(any(BusBooking.class));
    }

    @Test
    void testCustomerCannotBookForAnotherUser_UsesJwtUserId() {
        authenticateUser(10L, Role.USER);

        // Request has userId = 999 (tampered / impersonation attempt)
        when(userRepository.existsById(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(userCustomer));
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busTripRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seat1));
        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(anyLong(), anyLong(), anyList()))
                .thenReturn(Collections.emptyList());

        BusBooking bookingEntity = new BusBooking();
        when(busBookingMapper.busBookingRequestDtoToBusBooking(any())).thenReturn(bookingEntity);
        when(busBookingRepository.save(any())).thenAnswer(inv -> {
            BusBooking bb = inv.getArgument(0);
            assertEquals(10L, bb.getUser().getId(), "Booking must belong to JWT user 10, not 999");
            return bb;
        });
        when(busBookingMapper.busBookingToBusBookingDto(any())).thenReturn(new BusBookingDto());

        BusBookingRequestDto request = new BusBookingRequestDto(
                LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 999L, 1000L, 501L
        );

        busBookingService.createBusBooking(request);
        verify(userRepository, never()).findById(999L);
        verify(userRepository).findById(10L);
    }

    @Test
    void testSeatBelongsToDifferentBus_Rejected() {
        authenticateUser(10L, Role.USER);

        when(userRepository.existsById(10L)).thenReturn(true);
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(999L)).thenReturn(Optional.of(seatOtherBus));

        BusBookingRequestDto request = new BusBookingRequestDto(
                LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 10L, 1000L, 999L
        );

        assertThrows(InvalidSeatException.class, () -> busBookingService.createBusBooking(request));
        // Must fail fast BEFORE taking lock
        verify(busTripRepository, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void testTripCancelledOrDeparted_Rejected() {
        authenticateUser(10L, Role.USER);

        // Cancelled trip
        trip.setStatus(BusTripStatus.CANCELLED);
        when(userRepository.existsById(10L)).thenReturn(true);
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));

        BusBookingRequestDto request = new BusBookingRequestDto(
                LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 10L, 1000L, 501L
        );

        assertThrows(BusTripUnavailableException.class, () -> busBookingService.createBusBooking(request));
        verify(busTripRepository, never()).findByIdForUpdate(anyLong());

        // Departed trip (past departure date in Africa/Cairo)
        trip.setStatus(BusTripStatus.SCHEDULED);
        trip.setDepartureTime(LocalDateTime.now(ZoneId.of("Africa/Cairo")).minusMinutes(10));

        assertThrows(BusTripUnavailableException.class, () -> busBookingService.createBusBooking(request));
    }

    @Test
    void testSeatAlreadyBooked_RejectedWithSeatNumber() {
        authenticateUser(10L, Role.USER);

        when(userRepository.existsById(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(userCustomer));
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busTripRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seat1));
        // Seat already taken
        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(eq(1000L), eq(501L), eq(BusBookingRepository.ACTIVE_STATUSES)))
                .thenReturn(List.of(new BusBooking()));

        BusBookingRequestDto request = new BusBookingRequestDto(
                LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 10L, 1000L, 501L
        );

        SeatAlreadyBookedException ex = assertThrows(SeatAlreadyBookedException.class, () ->
                busBookingService.createBusBooking(request)
        );

        assertTrue(ex.getMessage().contains("1A"), "Error message should contain seat number 1A");
        verify(busBookingRepository, never()).save(any());
    }

    @Test
    void testCancelledBookingFreesSeat() {
        authenticateUser(10L, Role.USER);

        when(userRepository.existsById(10L)).thenReturn(true);
        when(userRepository.findById(10L)).thenReturn(Optional.of(userCustomer));
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busTripRepository.findByIdForUpdate(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seat1));

        // When previous booking is CANCELLED, ACTIVE_STATUSES (CONFIRMED, PENDING) query returns empty
        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(eq(1000L), eq(501L), eq(BusBookingRepository.ACTIVE_STATUSES)))
                .thenReturn(Collections.emptyList());

        BusBooking bookingEntity = new BusBooking();
        when(busBookingMapper.busBookingRequestDtoToBusBooking(any())).thenReturn(bookingEntity);
        when(busBookingRepository.save(any())).thenReturn(bookingEntity);
        when(busBookingMapper.busBookingToBusBookingDto(any())).thenReturn(new BusBookingDto());

        BusBookingRequestDto request = new BusBookingRequestDto(
                LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 10L, 1000L, 501L
        );

        BusBookingDto result = busBookingService.createBusBooking(request);
        assertNotNull(result);
        verify(busBookingRepository).save(any());
    }

    @Test
    void testConcurrentBookings_SameTripSameSeat_ExactlyOneSucceeds() throws Exception {
        // Simulates DB pessimistic lock behavior:
        // When findByIdForUpdate is called, threads acquire a lock.
        // The first thread books the seat; the second thread then sees seat taken.
        ReentrantLock tripLock = new ReentrantLock();
        List<Long> bookedSeats = new CopyOnWriteArrayList<>();

        when(userRepository.existsById(anyLong())).thenReturn(true);
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(userCustomer));
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seat1));

        when(busTripRepository.findByIdForUpdate(1000L)).thenAnswer(inv -> {
            tripLock.lock();
            return Optional.of(trip);
        });

        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(eq(1000L), eq(501L), anyList()))
                .thenAnswer(inv -> bookedSeats.contains(501L) ? List.of(new BusBooking()) : Collections.emptyList());

        when(busBookingMapper.busBookingRequestDtoToBusBooking(any())).thenReturn(new BusBooking());
        when(busBookingRepository.save(any())).thenAnswer(inv -> {
            bookedSeats.add(501L);
            return inv.getArgument(0);
        });
        when(busBookingMapper.busBookingToBusBookingDto(any())).thenAnswer(inv -> {
            tripLock.unlock();
            return new BusBookingDto();
        });

        int numThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CyclicBarrier barrier = new CyclicBarrier(numThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            final long uid = 10L + i;
            futures.add(executor.submit(() -> {
                try {
                    authenticateUser(uid, Role.USER);
                    barrier.await();
                    BusBookingRequestDto request = new BusBookingRequestDto(
                            LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), uid, 1000L, 501L
                    );
                    busBookingService.createBusBooking(request);
                    successCount.incrementAndGet();
                } catch (SeatAlreadyBookedException e) {
                    tripLock.unlock();
                    conflictCount.incrementAndGet();
                } catch (Exception e) {
                    if (tripLock.isHeldByCurrentThread()) {
                        tripLock.unlock();
                    }
                }
            }));
        }

        for (Future<?> f : futures) {
            f.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one parallel request must succeed");
        assertEquals(1, conflictCount.get(), "The other parallel request must receive SeatAlreadyBookedException");
    }

    @Test
    void testConcurrentBookings_SameTripDifferentSeats_BothSucceed() throws Exception {
        ReentrantLock tripLock = new ReentrantLock();
        List<Long> bookedSeats = new CopyOnWriteArrayList<>();

        when(userRepository.existsById(anyLong())).thenReturn(true);
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(userCustomer));
        when(busTripRepository.findById(1000L)).thenReturn(Optional.of(trip));
        when(busSeatRepository.findById(501L)).thenReturn(Optional.of(seat1));
        when(busSeatRepository.findById(502L)).thenReturn(Optional.of(seat2));

        when(busTripRepository.findByIdForUpdate(1000L)).thenAnswer(inv -> {
            tripLock.lock();
            return Optional.of(trip);
        });

        when(busBookingRepository.findByBusTripIdAndSeatIdAndStatusIn(eq(1000L), anyLong(), anyList()))
                .thenAnswer(inv -> {
                    Long seatId = inv.getArgument(1);
                    return bookedSeats.contains(seatId) ? List.of(new BusBooking()) : Collections.emptyList();
                });

        when(busBookingMapper.busBookingRequestDtoToBusBooking(any())).thenReturn(new BusBooking());
        when(busBookingRepository.save(any())).thenAnswer(inv -> {
            BusBooking bb = inv.getArgument(0);
            bookedSeats.add(bb.getSeat().getId());
            return bb;
        });
        when(busBookingMapper.busBookingToBusBookingDto(any())).thenAnswer(inv -> {
            tripLock.unlock();
            return new BusBookingDto();
        });

        int numThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CyclicBarrier barrier = new CyclicBarrier(numThreads);
        AtomicInteger successCount = new AtomicInteger(0);

        Long[] seats = new Long[]{501L, 502L};
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            final int index = i;
            futures.add(executor.submit(() -> {
                try {
                    authenticateUser(10L + index, Role.USER);
                    barrier.await();
                    BusBookingRequestDto request = new BusBookingRequestDto(
                            LocalDate.now(), BookingStatus.PENDING, BigDecimal.valueOf(150), 10L + index, 1000L, seats[index]
                    );
                    busBookingService.createBusBooking(request);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    if (tripLock.isHeldByCurrentThread()) {
                        tripLock.unlock();
                    }
                }
            }));
        }

        for (Future<?> f : futures) {
            f.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertEquals(2, successCount.get(), "Both requests on different seats must succeed sequentially under trip lock");
    }
}
