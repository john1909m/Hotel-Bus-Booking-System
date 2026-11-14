import { AnalyticsBusTripItemDto } from '../../models/Dashboard/bus-analytics.model';
import { getThemeTokens } from './chart-options';

export function getBusTripLabel(trip: AnalyticsBusTripItemDto): string {
  if (trip.routeName && trip.routeName.trim().length > 0) {
    return trip.routeName.trim();
  }
  return `Trip #${trip.tripId}`;
}

export function buildBusTripsChartData(
  items: AnalyticsBusTripItemDto[],
  isDark: boolean
): any {
  if (!items || items.length === 0) return null;
  const theme = getThemeTokens(isDark);

  return {
    labels: items.map((i) => getBusTripLabel(i)),
    datasets: [
      {
        label: 'Booked Seats',
        data: items.map((i) => i.bookedSeats),
        backgroundColor: theme.primary,
        borderRadius: 4,
      },
      {
        label: 'Total Capacity',
        data: items.map((i) => i.totalSeats),
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#E9CBA7',
        borderRadius: 4,
      },
    ],
  };
}

