package com.spring.boot.service.impl;

import com.spring.boot.dto.BusSeatDto;
import com.spring.boot.dto.BusSeatRequestDto;
import com.spring.boot.exception.ResourceNotFoundException;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.model.BusSeat;
import com.spring.boot.model.Bus;
import com.spring.boot.mapper.BusSeatMapper;
import com.spring.boot.repository.BusRepository;
import com.spring.boot.repository.BusSeatRepository;
import com.spring.boot.service.interfaces.BusSeatService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;


/**
 * Service implementation for BusSeat entity.
 */
@Service
@AllArgsConstructor
public class BusSeatServiceImpl implements BusSeatService {

    private final BusSeatRepository busSeatRepository;
    private final BusSeatMapper busSeatMapper;
    private final BusRepository busRepository;
    private final BundleMessageService bundleMessageService;

    @Override
    public BusSeatDto createBusSeat(BusSeatRequestDto busSeatRequestDto) {
        // Validate that bus exists
        Bus bus = busRepository.findById(busSeatRequestDto.getBusId())
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));

        BusSeat busSeat = busSeatMapper.busSeatRequestDtoToBusSeat(busSeatRequestDto);
        busSeat.setBus(bus);
        BusSeat savedBusSeat = busSeatRepository.save(busSeat);
        return busSeatMapper.busSeatToBusSeatDto(savedBusSeat);
    }

    @Override
    public BusSeatDto getBusSeatById(Long id) {
        BusSeat busSeat = busSeatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));
        return busSeatMapper.busSeatToBusSeatDto(busSeat);
    }

    @Override
    public java.util.List<BusSeatDto> getAllBusSeats() {
        return busSeatRepository.findAll().stream()
                .map(busSeatMapper::busSeatToBusSeatDto)
                .toList();
    }

    @Override
    public java.util.List<BusSeatDto> getBusSeatsByBusId(Long busId) {
        return busSeatRepository.findByBusId(busId).stream()
                .map(busSeatMapper::busSeatToBusSeatDto)
                .toList();
    }

    @Override
    public BusSeatDto updateBusSeat(Long id, BusSeatRequestDto busSeatRequestDto) {
        BusSeat existingBusSeat = busSeatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found")));

        // Update fields
        existingBusSeat.setSeatNumber(busSeatRequestDto.getSeatNumber());
        existingBusSeat.setSeatType(busSeatRequestDto.getSeatType());

        // Handle bus relationship: if provided, validate and set; if not provided, keep existing
        if (busSeatRequestDto.getBusId() != null) {
            Bus bus = busRepository.findById(busSeatRequestDto.getBusId())
                    .orElseThrow(() -> new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_not_found")));
            existingBusSeat.setBus(bus);
        }

        // Save bus seat
        BusSeat updatedBusSeat = busSeatRepository.save(existingBusSeat);

        // Return DTO
        return busSeatMapper.busSeatToBusSeatDto(updatedBusSeat);
    }

    @Override
    public void deleteBusSeat(Long id) {
        if (!busSeatRepository.existsById(id)) {
            throw new ResourceNotFoundException(bundleMessageService.getMessage("error.bus_seat_not_found"));
        }
        busSeatRepository.deleteById(id);
    }
}