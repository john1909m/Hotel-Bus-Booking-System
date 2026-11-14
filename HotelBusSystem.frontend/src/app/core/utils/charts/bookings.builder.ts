import { AnalyticsBookingPointDto } from '../../models/Dashboard/bookings.model';
import { getThemeTokens } from './chart-options';

export function buildBookingsChartData(points: AnalyticsBookingPointDto[], isDark: boolean): any {
  if (!points || points.length === 0) return null;
  const theme = getThemeTokens(isDark);

  return {
    labels: points.map((p) => p.periodStart),
    datasets: [
      {
        label: 'Bookings Count',
        data: points.map((p) => p.count),
        backgroundColor: theme.primary,
        borderRadius: 4,
      },
    ],
  };
}

