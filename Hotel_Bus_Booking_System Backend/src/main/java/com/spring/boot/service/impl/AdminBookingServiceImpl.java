package com.spring.boot.service.impl;

import com.spring.boot.dto.BookingSummaryDto;
import com.spring.boot.enums.BookingStatus;
import com.spring.boot.model.BusBooking;
import com.spring.boot.model.HotelBooking;
import com.spring.boot.repository.BusBookingRepository;
import com.spring.boot.repository.HotelBookingRepository;
import com.spring.boot.service.interfaces.AdminBookingService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service implementation for unified admin bookings.
 */
@Service
@AllArgsConstructor
public class AdminBookingServiceImpl implements AdminBookingService {

    private final HotelBookingRepository hotelBookingRepository;
    private final BusBookingRepository busBookingRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> getUnifiedBookings(String type, BookingStatus status, Pageable pageable) {
        BookingStatus queryStatus = status != null ? status : BookingStatus.ANY;

        if ("BUS".equalsIgnoreCase(type)) {
            Page<BusBooking> busBookings = busBookingRepository.findByFilters(
                    queryStatus, null, null, 0L, 0L, null, pageable
            );
            return busBookings.map(this::mapBusBooking);
        } else {
            // Default to HOTEL bookings for exact DB-level pagination and sorting
            Page<HotelBooking> hotelBookings = hotelBookingRepository.findByFilters(
                    queryStatus, null, null, 0L, 0L, pageable
            );
            return hotelBookings.map(this::mapHotelBooking);
        }
    }

    private BookingSummaryDto mapHotelBooking(HotelBooking hb) {
        String hotelName = hb.getHotel() != null ? hb.getHotel().getName() : "Hotel";
        String roomInfo = hb.getRoom() != null ? "Room " + hb.getRoom().getRoomNumber() : "";
        String desc = hotelName + (roomInfo.isEmpty() ? "" : " - " + roomInfo);

        return BookingSummaryDto.builder()
                .type("HOTEL")
                .id(hb.getId())
                .userId(hb.getUser() != null ? hb.getUser().getId() : null)
                .userName(hb.getUser() != null ? hb.getUser().getName() : null)
                .status(hb.getStatus())
                .totalPrice(hb.getTotalPrice())
                .createdAt(hb.getCreatedAt())
                .description(desc)
                .build();
    }

    private BookingSummaryDto mapBusBooking(BusBooking bb) {
        String routeInfo = "Bus Trip";
        if (bb.getBusTrip() != null && bb.getBusTrip().getRoute() != null) {
            var r = bb.getBusTrip().getRoute();
            String origin = r.getOriginStop() != null ? r.getOriginStop().getName() : "Origin";
            String dest = r.getDestinationStop() != null ? r.getDestinationStop().getName() : "Destination";
            routeInfo = origin + " -> " + dest;
        }
        String seatInfo = bb.getSeat() != null ? "Seat " + bb.getSeat().getSeatNumber() : "";
        String desc = routeInfo + (seatInfo.isEmpty() ? "" : " - " + seatInfo);

        return BookingSummaryDto.builder()
                .type("BUS")
                .id(bb.getId())
                .userId(bb.getUser() != null ? bb.getUser().getId() : null)
                .userName(bb.getUser() != null ? bb.getUser().getName() : null)
                .status(bb.getStatus())
                .totalPrice(bb.getPrice())
                .createdAt(bb.getCreatedAt())
                .description(desc)
                .build();
    }
}
