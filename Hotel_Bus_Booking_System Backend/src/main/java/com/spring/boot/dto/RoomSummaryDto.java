package com.spring.boot.dto;

import com.spring.boot.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Summary Data Transfer Object for Room within a booking.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomSummaryDto {
    private Long id;
    private Long roomId;
    private String roomNumber;
    private RoomType roomType;
    private Double pricePerNight;

    public RoomSummaryDto(Long roomId, String roomNumber, RoomType roomType, Double pricePerNight) {
        this.id = roomId;
        this.roomId = roomId;
        this.roomNumber = roomNumber;
        this.roomType = roomType;
        this.pricePerNight = pricePerNight;
    }
}
