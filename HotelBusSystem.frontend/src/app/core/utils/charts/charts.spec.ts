import { describe, it, expect } from 'vitest';
import {
  buildRevenueChartData,
  buildBookingsChartData,
  buildStatusChartData,
  buildPaymentsMethodChartData,
  buildPaymentsStatusChartData,
  buildOccupancyChartData,
  buildTopHotelsChartData,
  buildBusTripsChartData,
  getBusTripLabel,
  getLineChartOptions,
  getBarChartOptions,
  getDoughnutChartOptions,
} from './index';

describe('Chart Builders & Options', () => {
  it('should build revenue line chart data correctly', () => {
    const points = [
      { periodStart: '2026-10-01', revenue: 5000, hotelRevenue: 3000, busRevenue: 2000 },
      { periodStart: '2026-10-02', revenue: 0, hotelRevenue: 0, busRevenue: 0 },
    ];
    const result = buildRevenueChartData(points, false);

    expect(result.labels).toEqual(['2026-10-01', '2026-10-02']);
    expect(result.datasets).toHaveLength(3);
    expect(result.datasets[0].label).toBe('Total Revenue');
    expect(result.datasets[0].data).toEqual([5000, 0]);
    expect(result.datasets[1].label).toBe('Hotel Revenue');
    expect(result.datasets[1].data).toEqual([3000, 0]);
    expect(result.datasets[2].label).toBe('Bus Revenue');
    expect(result.datasets[2].data).toEqual([2000, 0]);
  });

  it('should return null for empty revenue data', () => {
    expect(buildRevenueChartData([], false)).toBeNull();
  });

  it('should build bookings bar chart data correctly', () => {
    const points = [
      { periodStart: '2026-10-01', count: 12 },
      { periodStart: '2026-10-02', count: 0 },
    ];
    const result = buildBookingsChartData(points, false);

    expect(result.labels).toEqual(['2026-10-01', '2026-10-02']);
    expect(result.datasets[0].data).toEqual([12, 0]);
  });

  it('should build status doughnut chart with all 4 statuses including zero counts', () => {
    const items: any = [
      { status: 'PENDING', count: 5 },
      { status: 'CONFIRMED', count: 20 },
      { status: 'COMPLETED', count: 15 },
      { status: 'CANCELLED', count: 0 },
    ];
    const result = buildStatusChartData(items, false);

    expect(result.labels).toEqual(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);
    expect(result.datasets[0].data).toEqual([5, 20, 15, 0]);
    expect(result.datasets[0].backgroundColor).toHaveLength(4);
  });

  it('should build payments method doughnut and status bar data', () => {
    const items: any = [
      { paymentMethod: 'CREDIT_CARD', paymentStatus: 'COMPLETED', count: 10, amount: 15000 },
      { paymentMethod: 'CASH', paymentStatus: 'COMPLETED', count: 2, amount: 2000 },
      { paymentMethod: 'CREDIT_CARD', paymentStatus: 'PENDING', count: 1, amount: 500 },
    ];

    const methodResult = buildPaymentsMethodChartData(items, false);
    expect(methodResult.labels).toEqual(['CREDIT_CARD', 'CASH']);
    // CREDIT_CARD amount: 15000 + 500 = 15500, CASH: 2000
    expect(methodResult.datasets[0].data).toEqual([15500, 2000]);

    const statusResult = buildPaymentsStatusChartData(items, false);
    expect(statusResult.labels).toEqual(['COMPLETED', 'PENDING']);
    // COMPLETED count: 10 + 2 = 12, PENDING count: 1
    expect(statusResult.datasets[0].data).toEqual([12, 1]);
  });

  it('should build occupancy horizontal bar chart data', () => {
    const items = [
      { hotelId: 1, hotelName: 'Grand Nile', roomNightsSold: 120, roomNightsAvailable: 150, occupancyRate: 0.8 },
    ];
    const result = buildOccupancyChartData(items, false);

    expect(result.labels).toEqual(['Grand Nile']);
    expect(result.datasets).toHaveLength(2);
    expect(result.datasets[0].label).toBe('Room Nights Sold');
    expect(result.datasets[0].data).toEqual([120]);
    expect(result.datasets[1].label).toBe('Room Nights Available');
    expect(result.datasets[1].data).toEqual([150]);
  });

  it('should build top hotels chart data depending on sort toggle', () => {
    const items = [
      { hotelId: 1, hotelName: 'Hotel Alpha', city: 'Cairo', bookings: 45, revenue: 90000 },
      { hotelId: 2, hotelName: 'Hotel Beta', city: 'Alexandria', bookings: 30, revenue: 60000 },
    ];

    const revenueResult = buildTopHotelsChartData(items, 'REVENUE', false);
    expect(revenueResult.datasets[0].label).toBe('Revenue (EGP)');
    expect(revenueResult.datasets[0].data).toEqual([90000, 60000]);

    const bookingsResult = buildTopHotelsChartData(items, 'BOOKINGS', false);
    expect(bookingsResult.datasets[0].label).toBe('Bookings Count');
    expect(bookingsResult.datasets[0].data).toEqual([45, 30]);
  });

  describe('Bus Trip Label Fallback', () => {
    it('should use routeName when provided', () => {
      expect(getBusTripLabel({ tripId: 101, routeName: 'Cairo to Hurghada' } as any)).toBe('Cairo to Hurghada');
    });

    it('should fallback to Trip #<id> when routeName is null, undefined, or empty', () => {
      expect(getBusTripLabel({ tripId: 102, routeName: null as any } as any)).toBe('Trip #102');
      expect(getBusTripLabel({ tripId: 103, routeName: '' } as any)).toBe('Trip #103');
      expect(getBusTripLabel({ tripId: 104, routeName: '   ' } as any)).toBe('Trip #104');
    });

    it('should build bus trips chart with fallback labels', () => {
      const trips = [
        { tripId: 201, routeName: 'Cairo - Luxor', departureTime: '2026-10-10', bookedSeats: 25, totalSeats: 40, loadFactor: 0.625 },
        { tripId: 202, routeName: '', departureTime: '2026-10-10', bookedSeats: 30, totalSeats: 50, loadFactor: 0.6 },
      ];
      const result = buildBusTripsChartData(trips, false);

      expect(result.labels).toEqual(['Cairo - Luxor', 'Trip #202']);
      expect(result.datasets[0].label).toBe('Booked Seats');
      expect(result.datasets[0].data).toEqual([25, 30]);
      expect(result.datasets[1].label).toBe('Total Capacity');
      expect(result.datasets[1].data).toEqual([40, 50]);
    });
  });

  describe('Theme Options Generation', () => {
    it('should generate line chart options with correct scales and legend for light and dark', () => {
      const lightOpts = getLineChartOptions(false, true);
      const darkOpts = getLineChartOptions(true, true);

      expect(lightOpts.responsive).toBe(true);
      expect(lightOpts.maintainAspectRatio).toBe(false);
      expect(darkOpts.plugins.tooltip.backgroundColor).toBe('#1e262b');
      expect(lightOpts.plugins.tooltip.backgroundColor).toBe('#ffffff');
    });

    it('should generate bar chart options supporting horizontal orientation', () => {
      const vertOpts = getBarChartOptions(false, false, false);
      const horizOpts = getBarChartOptions(false, true, false);

      expect(vertOpts.indexAxis).toBe('x');
      expect(horizOpts.indexAxis).toBe('y');
    });

    it('should generate doughnut chart options with bottom legend', () => {
      const doughnutOpts = getDoughnutChartOptions(false, false);
      expect(doughnutOpts.plugins.legend.position).toBe('bottom');
    });
  });
});

