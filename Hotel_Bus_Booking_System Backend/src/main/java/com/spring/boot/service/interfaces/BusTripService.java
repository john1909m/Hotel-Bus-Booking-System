package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.spring.boot.enums.BusTripStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;


public interface BusTripService {

    BusTripDto createBusTrip(BusTripRequestDto busTripRequestDto);

    BusTripDto getBusTripById(Long id);

    List<BusTripDto> getAllBusTrips();

    List<BusTripDto> getBusTripsByBusId(Long busId);

    List<BusTripDto> getBusTripsByRouteId(Long routeId);

    Page<BusTripDto> getAllBusTripsPaginated(Pageable pageable,
                                             Long busId, Long routeId, BusTripStatus status,
                                             LocalDateTime departureAfter, LocalDateTime departureBefore);

    List<BusTripDto> lookupBusTrips(String query, Pageable pageable);

    BusTripDto updateBusTrip(Long id, BusTripRequestDto busTripRequestDto);

    void deleteBusTrip(Long id);

    /**
     * Find suitable outgoing bus trips based on hotel and check-in time.
     *
     * @param hotelId         the hotel ID
     * @param checkInDate     the check-in date
     * @param checkInTime     the check-in time (as string, e.g., "15:00")
     * @param timeBufferHours the time buffer in hours before check-in
     * @return list of suitable bus trips
     */
    List<BusTripDto> findSuitableOutgoingTrips(Long hotelId, LocalDate checkInDate,
                                               String checkInTime, int timeBufferHours);

    /**
     * Find suitable return bus trips based on hotel and check-out time.
     *
     * @param hotelId          the hotel ID
     * @param checkOutDate     the check-out date
     * @param checkOutTime     the check-out time (as string, e.g., "11:00")
     * @param timeBufferHours  the time buffer in hours after check-out
     * @return list of suitable bus trips
     */
    List<BusTripDto> findSuitableReturnTrips(Long hotelId, LocalDate checkOutDate,
                                             String checkOutTime, int timeBufferHours);
}