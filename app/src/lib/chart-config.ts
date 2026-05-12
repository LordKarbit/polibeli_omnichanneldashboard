import type { EChartsOption } from 'echarts';
import { chartColors } from './theme';

/** Base ECharts theme options for dark mode dashboard */
export function getBaseChartOptions(): EChartsOption {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'var(--font-app-sans), Inter, system-ui, sans-serif',
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
    },
    title: {
      textStyle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: 600,
      },
      subtextStyle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
      },
    },
    legend: {
      textStyle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
      },
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 16,
    },
    tooltip: {
      backgroundColor: 'rgba(15, 15, 30, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
      },
      extraCssText: 'backdrop-filter: blur(12px); border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);',
    },
    grid: {
      left: 12,
      right: 12,
      top: 40,
      bottom: 12,
      containLabel: true,
    },
    xAxis: {
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisTick: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    color: [...chartColors.primary],
  };
}

/** Merge base options with specific chart options */
export function mergeChartOptions(specific: EChartsOption): EChartsOption {
  const base = getBaseChartOptions();
  return {
    ...base,
    ...specific,
    textStyle: { ...base.textStyle, ...(specific.textStyle as object) },
    tooltip: { ...(base.tooltip as object), ...(specific.tooltip as object) },
    grid: { ...(base.grid as object), ...(specific.grid as object) },
  };
}
