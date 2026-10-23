package com.spring.boot.dto;

import com.spring.boot.enums.RoomType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Object for HotelImage entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Data Transfer Object for Hotel gallery image")
public class HotelImageDto {

    @Schema(description = "Unique image ID", example = "1")
    private Long id;

    @Schema(description = "ID of the hotel this image belongs to", example = "10")
    private Long hotelId;

    @Schema(description = "Room type (SINGLE, DOUBLE, SUITE, DELUXE), or null if hotel-level image", example = "DOUBLE", nullable = true)
    private RoomType roomType;

    @Schema(description = "Public URL of the image", example = "https://images.example.com/hotels/1/lobby.jpg")
    private String url;

    @Schema(description = "Display sort order", example = "0")
    private int sortOrder;
}
