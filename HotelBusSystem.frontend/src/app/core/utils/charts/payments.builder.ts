import { AnalyticsPaymentItemDto } from '../../models/Dashboard/payments-analytics.model';
import { getThemeTokens } from './chart-options';

const METHOD_PALETTE = ['#009B77', '#38bdf8', '#f59e0b', '#a855f7', '#ec4899', '#6366f1'];

export function buildPaymentsMethodChartData(
  items: AnalyticsPaymentItemDto[],
  isDark: boolean
): any {
  if (!items || items.length === 0) return null;

  // Group by paymentMethod
  const methodMap = new Map<string, number>();
  for (const item of items) {
    const current = methodMap.get(item.paymentMethod) || 0;
    methodMap.set(item.paymentMethod, current + (item.amount || 0));
  }

  const labels = Array.from(methodMap.keys());
  const data = Array.from(methodMap.values());
  const backgroundColor = labels.map((_, idx) => METHOD_PALETTE[idx % METHOD_PALETTE.length]);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderColor: isDark ? '#1e262b' : '#ffffff',
        borderWidth: 1,
      },
    ],
  };
}

export function buildPaymentsStatusChartData(
  items: AnalyticsPaymentItemDto[],
  isDark: boolean
): any {
  if (!items || items.length === 0) return null;
  const theme = getThemeTokens(isDark);

  // Group by paymentStatus
  const statusMap = new Map<string, number>();
  for (const item of items) {
    const current = statusMap.get(item.paymentStatus) || 0;
    statusMap.set(item.paymentStatus, current + (item.count || 0));
  }

  const labels = Array.from(statusMap.keys());
  const data = Array.from(statusMap.values());
  const statusColors: Record<string, string> = {
    COMPLETED: '#10b981',
    PENDING: '#f59e0b',
    FAILED: '#ef4444',
    REFUNDED: '#0ea5e9',
  };

  const backgroundColor = labels.map((s) => statusColors[s] || theme.primary);

  return {
    labels,
    datasets: [
      {
        label: 'Transactions Count',
        data,
        backgroundColor,
        borderRadius: 4,
      },
    ],
  };
}
