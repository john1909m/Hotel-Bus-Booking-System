package com.spring.boot.dto.analytics;

import com.spring.boot.enums.PaymentMethod;
import com.spring.boot.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Item representing payments grouped by method and status.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsPaymentItemDto {
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private Long count;
    private BigDecimal amount;
}
