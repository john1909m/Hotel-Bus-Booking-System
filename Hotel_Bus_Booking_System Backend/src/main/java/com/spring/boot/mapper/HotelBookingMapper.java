package com.spring.boot.mapper;

import com.spring.boot.dto.HotelBookingDto;
import com.spring.boot.dto.HotelBookingRequestDto;
import com.spring.boot.dto.RoomSummaryDto;
import com.spring.boot.model.HotelBooking;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

import java.util.Collections;
import java.util.List;

/**
 * MapStruct mapper for HotelBooking entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface HotelBookingMapper {

    HotelBookingMapper INSTANCE = Mappers.getMapper(HotelBookingMapper.class);

    HotelBooking hotelBookingRequestDtoToHotelBooking(HotelBookingRequestDto hotelBookingRequestDto);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(source = "room.id", target = "roomId")
    @Mapping(source = "hotel.id", target = "hotelId")
    @Mapping(target = "hotelName", source = "hotel.name")
    @Mapping(target = "rooms", ignore = true)
    HotelBookingDto hotelBookingToHotelBookingDto(HotelBooking hotelBooking);

    @AfterMapping
    default void populateRooms(HotelBooking hotelBooking, @MappingTarget HotelBookingDto dto) {
        if (hotelBooking.getBookingRooms() != null && !hotelBooking.getBookingRooms().isEmpty()) {
            dto.setRooms(hotelBooking.getBookingRooms().stream()
                    .map(br -> new RoomSummaryDto(
                            br.getRoom() != null ? br.getRoom().getId() : null,
                            br.getRoom() != null ? br.getRoom().getId() : null,
                            br.getRoom() != null ? br.getRoom().getRoomNumber() : null,
                            br.getRoom() != null ? br.getRoom().getRoomType() : null,
                            br.getPricePerNight()
                    ))
                    .toList());
            if (dto.getRoomId() == null && !hotelBooking.getBookingRooms().isEmpty() && hotelBooking.getBookingRooms().get(0).getRoom() != null) {
                dto.setRoomId(hotelBooking.getBookingRooms().get(0).getRoom().getId());
            }
        } else if (hotelBooking.getRoom() != null) {
            dto.setRooms(List.of(new RoomSummaryDto(
                    hotelBooking.getRoom().getId(),
                    hotelBooking.getRoom().getId(),
                    hotelBooking.getRoom().getRoomNumber(),
                    hotelBooking.getRoom().getRoomType(),
                    hotelBooking.getRoom().getPricePerNight()
            )));
        } else {
            dto.setRooms(Collections.emptyList());
        }

        if (dto.getAdults() == null && hotelBooking.getGuests() != null) {
            dto.setAdults(hotelBooking.getGuests());
        }
        if (dto.getChildAges() == null) {
            dto.setChildAges(Collections.emptyList());
        }
    }
}