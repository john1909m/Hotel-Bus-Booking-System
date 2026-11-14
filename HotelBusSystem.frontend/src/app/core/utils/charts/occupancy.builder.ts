import { AnalyticsOccupancyItemDto } from '../../models/Dashboard/hotels-analytics.model';
import { getThemeTokens } from './chart-options';

export function buildOccupancyChartData(
  items: AnalyticsOccupancyItemDto[],
  isDark: boolean
): any {
  if (!items || items.length === 0) return null;
  const theme = getThemeTokens(isDark);

  return {
    labels: items.map((i) => i.hotelName || `Hotel #${i.hotelId}`),
    datasets: [
      {
        label: 'Room Nights Sold',
        data: items.map((i) => i.roomNightsSold),
        backgroundColor: theme.primary,
        borderRadius: 4,
      },
      {
        label: 'Room Nights Available',
        data: items.map((i) => i.roomNightsAvailable),
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#C2D6D8',
        borderRadius: 4,
      },
    ],
  };
}
