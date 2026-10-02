package com.spring.boot.dto;

import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for Payment entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDto {

    private Long id;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private LocalDateTime transactionDate;
    private Long hotelBookingId; // Reference to hotel booking
    private Long busBookingId; // Reference to bus booking
}