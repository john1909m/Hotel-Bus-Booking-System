package com.spring.boot.mapper;

import com.spring.boot.dto.PaymentDto;
import com.spring.boot.dto.PaymentRequestDto;
import com.spring.boot.model.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * MapStruct mapper for Payment entity and DTOs.
 */
@Mapper(componentModel = "spring")
public interface PaymentMapper {

    PaymentMapper INSTANCE = Mappers.getMapper(PaymentMapper.class);

    @Mapping(target = "hotelBooking.id", source = "hotelBookingId")
    @Mapping(target = "busBooking.id", source = "busBookingId")
    Payment paymentRequestDtoToPayment(PaymentRequestDto paymentRequestDto);

    @Mapping(source = "hotelBooking.id", target = "hotelBookingId")
    @Mapping(source = "busBooking.id", target = "busBookingId")
    PaymentDto paymentToPaymentDto(Payment payment);
}