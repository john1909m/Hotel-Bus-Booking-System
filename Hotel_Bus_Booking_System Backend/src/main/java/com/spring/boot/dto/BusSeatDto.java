package com.spring.boot.dto;


import com.spring.boot.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;



/**
 * Data Transfer Object for BusSeat entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusSeatDto {

    private Long id;
    private String seatNumber;
    private SeatType seatType;
    private Long busId; // Reference to bus
}