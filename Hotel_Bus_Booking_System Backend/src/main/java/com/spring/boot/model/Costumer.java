package com.spring.boot.model;

import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "costumer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Costumer extends User{



    @OneToMany(mappedBy = "costumer")
    private List<HotelBooking> hotelBookings;

    @OneToMany(mappedBy = "costumer")
    private List<BusBooking> busBookings;

}
