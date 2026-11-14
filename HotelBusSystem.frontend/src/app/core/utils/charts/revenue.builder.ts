import { AnalyticsRevenuePointDto } from '../../models/Dashboard/revenue.model';
import { getThemeTokens } from './chart-options';

export function buildRevenueChartData(points: AnalyticsRevenuePointDto[], isDark: boolean): any {
  if (!points || points.length === 0) return null;
  const theme = getThemeTokens(isDark);

  return {
    labels: points.map((p) => p.periodStart),
    datasets: [
      {
        label: 'Total Revenue',
        data: points.map((p) => p.revenue),
        borderColor: theme.primary,
        backgroundColor: theme.primary,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Hotel Revenue',
        data: points.map((p) => p.hotelRevenue),
        borderColor: '#38bdf8',
        backgroundColor: '#38bdf8',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Bus Revenue',
        data: points.map((p) => p.busRevenue),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.3,
        fill: false,
      },
    ],
  };
}
