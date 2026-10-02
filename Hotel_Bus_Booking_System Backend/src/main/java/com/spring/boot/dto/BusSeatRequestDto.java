package com.spring.boot.dto;

import com.spring.boot.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.antlr.v4.runtime.misc.NotNull;

/**
 * Request Data Transfer Object for BusSeat entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusSeatRequestDto {


    private String seatNumber;

    @NotNull
    private SeatType seatType;

    @NotNull
    private Long busId;
}