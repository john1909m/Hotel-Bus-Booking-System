export interface ThemePalette {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  softBlue: string;
  warmSand: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  borderSubtle: string;
  bgSurface: string;
  statusConfirmed: string;
  statusCompleted: string;
  statusPending: string;
  statusCancelled: string;
}

/**
 * Reads CSS variable value from document.documentElement or returns fallback.
 */
function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

/**
 * Resolves current theme tokens from CSS variables.
 */
export function getThemeTokens(isDark: boolean): ThemePalette {
  return {
    primary: getCssVar('--color-primary', '#009B77'),
    primaryHover: getCssVar('--color-primary-hover', '#007d60'),
    primaryLight: getCssVar('--color-primary-light', '#e0f5ef'),
    softBlue: getCssVar('--color-soft-blue', '#C2D6D8'),
    warmSand: getCssVar('--color-warm-sand', '#E9CBA7'),
    textPrimary: getCssVar('--text-primary', isDark ? '#f3f4f6' : '#2E3A40'),
    textSecondary: getCssVar('--text-secondary', isDark ? '#9ca3af' : '#5a6870'),
    textMuted: getCssVar('--text-muted', isDark ? '#6b7280' : '#8a9ba3'),
    borderColor: getCssVar('--border-color', isDark ? 'rgba(255, 255, 255, 0.12)' : '#dde4e6'),
    borderSubtle: getCssVar('--border-subtle', isDark ? 'rgba(255, 255, 255, 0.06)' : '#edf0f1'),
    bgSurface: getCssVar('--bg-surface', isDark ? '#1e262b' : '#F4F1E7'),
    statusConfirmed: '#10b981',
    statusCompleted: '#0ea5e9',
    statusPending: '#f59e0b',
    statusCancelled: '#ef4444',
  };
}

export function formatEgpCurrency(val: number): string {
  return `EGP ${Number(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Returns options for Line Charts (Revenue).
 */
export function getLineChartOptions(isDark: boolean, isCurrency = false): any {
  const theme = getThemeTokens(isDark);
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 12 },
          boxWidth: 12,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e262b' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#2E3A40',
        bodyColor: isDark ? '#e5e7eb' : '#5a6870',
        borderColor: theme.borderColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            return isCurrency ? ` ${label}: ${formatEgpCurrency(val)}` : ` ${label}: ${val}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.borderSubtle,
        },
        ticks: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: theme.borderSubtle,
        },
        ticks: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: (value: any) => (isCurrency ? `${value.toLocaleString()} EGP` : value),
        },
      },
    },
  };
}

/**
 * Returns options for Bar Charts (Vertical or Horizontal).
 */
export function getBarChartOptions(
  isDark: boolean,
  horizontal = false,
  isCurrency = false
): any {
  const theme = getThemeTokens(isDark);
  const indexAxis = horizontal ? 'y' : 'x';

  return {
    indexAxis,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 12 },
          boxWidth: 12,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e262b' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#2E3A40',
        bodyColor: isDark ? '#e5e7eb' : '#5a6870',
        borderColor: theme.borderColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const val = horizontal ? context.parsed.x : context.parsed.y;
            return isCurrency ? ` ${label}: ${formatEgpCurrency(val)}` : ` ${label}: ${val}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: theme.borderSubtle,
        },
        ticks: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: horizontal && isCurrency ? (val: any) => `${val.toLocaleString()} EGP` : undefined,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: theme.borderSubtle,
        },
        ticks: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: !horizontal && isCurrency ? (val: any) => `${val.toLocaleString()} EGP` : undefined,
        },
      },
    },
  };
}

/**
 * Returns options for Doughnut / Pie Charts.
 */
export function getDoughnutChartOptions(isDark: boolean, isCurrency = false): any {
  const theme = getThemeTokens(isDark);
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme.textSecondary,
          font: { family: "'Inter', sans-serif", size: 12 },
          boxWidth: 14,
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e262b' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#2E3A40',
        bodyColor: isDark ? '#e5e7eb' : '#5a6870',
        borderColor: theme.borderColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const val = context.parsed;
            return isCurrency ? ` ${label}: ${formatEgpCurrency(val)}` : ` ${label}: ${val}`;
          },
        },
      },
    },
  };
}

