package com.spring.boot.service.interfaces;

import com.spring.boot.dto.BusStopDto;
import com.spring.boot.dto.BusStopRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;


public interface BusStopService {

    BusStopDto createBusStop(BusStopRequestDto busStopRequestDto);

    BusStopDto getBusStopById(Long id);

    List<BusStopDto> getAllBusStops();

    Page<BusStopDto> getAllBusStopsPaginated(Pageable pageable,
                                             String q, String city);

    List<BusStopDto> lookupBusStops(String query, Pageable pageable);

    BusStopDto updateBusStop(Long id, BusStopRequestDto busStopRequestDto);

    void deleteBusStop(Long id);
}