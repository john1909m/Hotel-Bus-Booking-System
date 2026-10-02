package com.spring.boot.dto;

import com.spring.boot.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for Room entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomDto {

    private Long id;
    private String roomNumber;
    private RoomType roomType;
    private Integer capacity;
    private Double pricePerNight;
    private Long hotelId; // Reference to hotel
}