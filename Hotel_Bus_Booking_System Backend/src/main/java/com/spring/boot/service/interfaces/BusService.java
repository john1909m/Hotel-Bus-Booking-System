package com.spring.boot.service.interfaces;
import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusRequestDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;

import java.util.List;


/**
 * Service interface for Bus entity.
 */
public interface BusService {

    BusDto createBus(BusRequestDto busRequestDto);

    BusDto getBusById(Long id);

    List<BusDto> getAllBuses();

    Page<BusDto> getAllBusesPaginated(Pageable pageable,
                                      String q, String busType, String company);

    List<BusDto> lookupBuses(String query, Pageable pageable);

    BusDto updateBus(Long id, BusRequestDto busRequestDto);

    void deleteBus(Long id);
}