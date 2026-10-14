package com.spring.boot.util;

import com.spring.boot.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Slice;

/**
 * Utility class for pagination operations.
 * Provides methods to convert Spring Data Page/Slice to custom PageResponse DTO.
 *
 * Usage example:
 * Page<Hotel> hotelPage = hotelRepository.findAll(pageable);
 * PageResponse<HotelDto> response = PaginationUtil.toPageResponse(hotelPage, hotelMapper::toDto);
 */
public class PaginationUtil {

    /**
     * Converts a Spring Data Page to PageResponse DTO using the provided mapper function.
     *
     * @param page    The Spring Data Page containing entities
     * @param mapper  Function to convert entity to DTO
     * @param <T>     Entity type
     * @param <U>     DTO type
     * @return PageResponse containing the mapped DTOs
     */
    public static <T, U> PageResponse<U> toPageResponse(Page<T> page, java.util.function.Function<T, U> mapper) {
        PageResponse<U> response = new PageResponse<>();
        response.setContent(page.getContent().stream().map(mapper).toList());
        response.setPage(page.getNumber()); // Spring Data Page uses 0-based index
        response.setSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setFirst(page.isFirst());
        response.setLast(page.isLast());
        return response;
    }

    /**
     * Converts a Spring Data Slice to PageResponse DTO using the provided mapper function.
     * Note: For Slice, totalElements and totalPages are not available, so they are set to -1.
     *
     * @param slice   The Spring Data Slice containing entities
     * @param mapper  Function to convert entity to DTO
     * @param <T>     Entity type
     * @param <U>     DTO type
     * @return PageResponse containing the mapped DTOs
     */
    public static <T, U> PageResponse<U> toPageResponseSlice(Slice<T> slice, java.util.function.Function<T, U> mapper) {
        PageResponse<U> response = new PageResponse<>();
        response.setContent(slice.getContent().stream().map(mapper).toList());
        response.setPage(slice.getNumber()); // Spring Data Slice uses 0-based index
        response.setSize(slice.getSize());
        // For Slice, we don't have total elements/pages info
        response.setTotalElements(-1);
        response.setTotalPages(-1);
        response.setFirst(slice.isFirst());
        response.setLast(slice.isLast());
        return response;
    }
}