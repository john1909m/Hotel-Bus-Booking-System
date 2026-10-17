import { Component, OnInit, inject } from '@angular/core';
import { BusBookingService } from '../../../core/services/bus-booking.service';

@Component({
  selector: 'app-BusBookings',
  standalone: true,
  imports: [],
  templateUrl: './BusBookings.component.html',
  styleUrls: ['./BusBookings.component.css']
})
export class BusBookingsComponent implements OnInit {
  private readonly busBookingService = inject(BusBookingService);

  ngOnInit() {
     this.busBookingService.getMyBusBookings().subscribe({
      next: (response) => {
        console.log('Bus Bookings:', response);
      },
      error: (error) => {
        console.error('Failed to fetch bus bookings:', error);
      },
    });
  }

}
