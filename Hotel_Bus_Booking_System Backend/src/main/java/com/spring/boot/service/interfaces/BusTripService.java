package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusTripDto;
import com.spring.boot.dto.BusTripRequestDto;

import java.util.List;



/**
 * Service interface for BusTrip entity.
 */
public interface BusTripService {

    BusTripDto createBusTrip(BusTripRequestDto busTripRequestDto);

    BusTripDto getBusTripById(Long id);

    List<BusTripDto> getAllBusTrips();

    List<BusTripDto> getBusTripsByBusId(Long busId);

    List<BusTripDto> getBusTripsByRouteId(Long routeId);

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
    List<BusTripDto> findSuitableOutgoingTrips(Long hotelId, java.time.LocalDate checkInDate,
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
    List<BusTripDto> findSuitableReturnTrips(Long hotelId, java.time.LocalDate checkOutDate,
                                             String checkOutTime, int timeBufferHours);
}