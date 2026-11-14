import { AnalyticsBookingStatusItemDto } from '../../models/Dashboard/bookings.model';
import { getThemeTokens } from './chart-options';

const STATUS_COLOR_MAP: Record<string, string> = {
  CONFIRMED: '#10b981',
  COMPLETED: '#0ea5e9',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

export function buildStatusChartData(items: AnalyticsBookingStatusItemDto[], isDark: boolean): any {
  if (!items || items.length === 0) return null;
  const theme = getThemeTokens(isDark);

  const labels = items.map((i) => i.status);
  const data = items.map((i) => i.count);
  const backgroundColor = items.map(
    (i) => STATUS_COLOR_MAP[i.status] || theme.textMuted
  );

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderWidth: 1,
        borderColor: isDark ? '#1e262b' : '#ffffff',
      },
    ],
  };
}

