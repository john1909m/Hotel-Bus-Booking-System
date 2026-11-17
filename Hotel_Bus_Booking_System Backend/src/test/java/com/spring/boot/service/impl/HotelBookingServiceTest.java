package com.spring.boot.service.impl;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.dto.UserDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.enums.Role;
import com.spring.boot.enums.RoomType;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HotelBookingServiceTest {

    @Mock
    private HotelBookingRepository hotelBookingRepository;

    @Mock
    private HotelBookingRoomRepository hotelBookingRoomRepository;

    @Mock
    private HotelBookingMapper hotelBookingMapper;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private HotelRepository hotelRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private HotelBookingServiceImpl hotelBookingService;

    private User adminUser;
    private User regularUser;
    private User otherUser;
    private Hotel hotel;
    private Room room;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));

        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setEmail("admin@test.com");
        adminUser.setRole(Role.ADMIN);

        regularUser = new User();
        regularUser.setId(2L);
        regularUser.setEmail("user@test.com");
        regularUser.setRole(Role.USER);

        otherUser = new User();
        otherUser.setId(3L);
        otherUser.setEmail("other@test.com");
        otherUser.setRole(Role.USER);

        hotel = new Hotel();
        hotel.setId(10L);
        hotel.setName("Grand Hotel");

        room = new Room();
        room.setId(100L);
        room.setRoomNumber("101");
        room.setRoomType(RoomType.DELUXE);
        room.setCapacity(2);
        room.setPricePerNight(150.0);
        room.setHotel(hotel);
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

    private void mockRoomBookingDependencies() {
        when(roomRepository.findAllByIdsForUpdate(anyList())).thenReturn(List.of(room));
        when(hotelBookingRepository.findOverlappingBookings(anyLong(), any(), any())).thenReturn(Collections.emptyList());
        HotelBooking bookingEntity = new HotelBooking();
        when(hotelBookingMapper.hotelBookingRequestDtoToHotelBooking(any())).thenReturn(bookingEntity);
        when(hotelBookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(hotelBookingRoomRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(hotelBookingMapper.hotelBookingToHotelBookingDto(any())).thenReturn(new HotelBookingDto());
    }

    @Test
    void testAdminBookingOnBehalfOfAnotherUser_Success() {
        authenticateUser(1L, Role.ADMIN);

        when(userRepository.findById(3L)).thenReturn(Optional.of(otherUser));
        mockRoomBookingDependencies();

        HotelBookingRequestDto request = new HotelBookingRequestDto(
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3),
                2,
                100L
        );
        request.setUserId(3L);

        hotelBookingService.createHotelBooking(request, 1L);

        verify(userRepository).findById(3L);
        verify(hotelBookingRepository).save(argThat(booking ->
                booking.getUser() != null && booking.getUser().getId().equals(3L)
        ));
    }

    @Test
    void testNormalUserBookingWithAnotherUserId_IgnoresUserIdAndUsesLoggedInUser() {
        authenticateUser(2L, Role.USER);

        when(userRepository.findById(2L)).thenReturn(Optional.of(regularUser));
        mockRoomBookingDependencies();

        HotelBookingRequestDto request = new HotelBookingRequestDto(
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3),
                2,
                100L
        );
        request.setUserId(3L); // Tamper attempt

        hotelBookingService.createHotelBooking(request, 2L);

        verify(userRepository, never()).findById(3L);
        verify(userRepository).findById(2L);
        verify(hotelBookingRepository).save(argThat(booking ->
                booking.getUser() != null && booking.getUser().getId().equals(2L)
        ));
    }

    @Test
    void testAdminBookingWithNonExistentUserId_Throws404() {
        authenticateUser(1L, Role.ADMIN);

        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        HotelBookingRequestDto request = new HotelBookingRequestDto(
                LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(3),
                2,
                100L
        );
        request.setUserId(999L);

        assertThrows(ResourceNotFoundException.class, () ->
                hotelBookingService.createHotelBooking(request, 1L)
        );

        verify(userRepository).findById(999L);
        verify(hotelBookingRepository, never()).save(any());
    }
}
