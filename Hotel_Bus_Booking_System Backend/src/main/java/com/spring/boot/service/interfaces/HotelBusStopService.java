package com.spring.boot.service.interfaces;

import com.spring.boot.dto.HotelBusStopDto;
import com.spring.boot.dto.HotelBusStopRequestDto;
import com.spring.boot.dto.PageResponse;

import java.util.List;


/**
 * Service interface for HotelBusStop entity.
 */
public interface HotelBusStopService {

    HotelBusStopDto createHotelBusStop(HotelBusStopRequestDto hotelBusStopRequestDto);

    HotelBusStopDto getHotelBusStopById(Long id);

    List<HotelBusStopDto> getAllHotelBusStops();

    PageResponse<HotelBusStopDto> getAllHotelBusStopsPaginated(int page, int size, String sortBy, String sortDirection,
                                                               String q, Long hotelId, Long busStopId);

    List<HotelBusStopDto> getHotelBusStopsByHotelId(Long hotelId);

    List<HotelBusStopDto> getHotelBusStopsByBusStopId(Long busStopId);

    HotelBusStopDto updateHotelBusStop(Long id, HotelBusStopRequestDto hotelBusStopRequestDto);

    void deleteHotelBusStop(Long id);
}