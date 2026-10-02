package com.spring.boot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Request Data Transfer Object for Bus entity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusRequestDto {


    private String busNumber;


    private String company;


    private Integer capacity;

    private String busType;
}