package com.spring.boot.repository;

import com.spring.boot.enums.RoomType;
import com.spring.boot.model.HotelImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for HotelImage entity.
 */
@Repository
public interface HotelImageRepository extends JpaRepository<HotelImage, Long> {

    List<HotelImage> findByHotelIdOrderBySortOrderAscIdAsc(Long hotelId);

    List<HotelImage> findByHotelIdAndRoomTypeOrderBySortOrderAscIdAsc(Long hotelId, RoomType roomType);

    @Modifying
    @Query("DELETE FROM HotelImage hi WHERE hi.hotel.id = :hotelId")
    void deleteByHotelId(@Param("hotelId") Long hotelId);
}
