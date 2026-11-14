import { AnalyticsTopHotelItemDto, TopHotelsSortBy } from '../../models/Dashboard/hotels-analytics.model';
import { getThemeTokens } from './chart-options';

export function buildTopHotelsChartData(
  items: AnalyticsTopHotelItemDto[],
  sortBy: TopHotelsSortBy,
  isDark: boolean
): any {
  if (!items || items.length === 0) return null;
  const theme = getThemeTokens(isDark);
  const isRevenue = sortBy === 'REVENUE';

  return {
    labels: items.map((i) => i.hotelName || `Hotel #${i.hotelId}`),
    datasets: [
      {
        label: isRevenue ? 'Revenue (EGP)' : 'Bookings Count',
        data: items.map((i) => (isRevenue ? i.revenue : i.bookings)),
        backgroundColor: isRevenue ? theme.primary : '#38bdf8',
        borderRadius: 4,
      },
    ],
  };
}

