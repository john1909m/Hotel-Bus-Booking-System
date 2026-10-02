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
@Mapper
public interface PaymentMapper {

    PaymentMapper INSTANCE = Mappers.getMapper(PaymentMapper.class);

    Payment paymentRequestDtoToPayment(PaymentRequestDto paymentRequestDto);

    PaymentDto paymentToPaymentDto(Payment payment);
}