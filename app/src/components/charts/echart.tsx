'use client';

import { useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart, ScatterChart, TreemapChart, FunnelChart, HeatmapChart, CustomChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  VisualMapComponent,
} from 'echarts/components';
import type { EChartsOption } from 'echarts';

// Register all ECharts components
echarts.use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  TreemapChart,
  FunnelChart,
  HeatmapChart,
  CustomChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  VisualMapComponent,
]);

interface EChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (params: unknown) => void;
}

type DashboardTheme = 'dark' | 'light';

function currentDashboardTheme(): DashboardTheme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function lightChartColor(value: string) {
  return value
    .replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, (_match, alphaValue: string) => {
      const alpha = Number(alphaValue);
      const nextAlpha = alpha <= 0.08 ? 0.08 : alpha <= 0.16 ? 0.14 : alpha <= 0.5 ? 0.48 : alpha <= 0.72 ? 0.68 : alpha;
      return `rgba(15, 23, 42, ${Number(nextAlpha.toFixed(2))})`;
    })
    .replace(/rgba\(\s*2\s*,\s*6\s*,\s*23\s*,\s*([0-9.]+)\s*\)/gi, 'rgba(255, 255, 255, $1)')
    .replace(/#fff\b/gi, '#0f172a')
    .replace(/#ffffff\b/gi, '#0f172a');
}

function adaptChartOptionForTheme<T>(value: T, theme: DashboardTheme): T {
  if (theme === 'dark') return value;
  if (typeof value === 'string') return lightChartColor(value) as T;
  if (Array.isArray(value)) return value.map((item) => adaptChartOptionForTheme(item, theme)) as T;
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    output[key] = adaptChartOptionForTheme(item, theme);
  });
  return output as T;
}

export function EChart({ option, style, className, onClick }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);
  const [theme, setTheme] = useState<DashboardTheme>('dark');

  useEffect(() => {
    const syncTheme = () => setTheme(currentDashboardTheme());
    syncTheme();
    window.addEventListener('dashboard-theme-change', syncTheme);

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('dashboard-theme-change', syncTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    }

    instanceRef.current.setOption(adaptChartOptionForTheme(option, theme), true);
    instanceRef.current.off('click');
    if (onClick) {
      instanceRef.current.on('click', onClick);
    }

    // Resize observer
    const observer = new ResizeObserver(() => {
      instanceRef.current?.resize();
    });
    observer.observe(chartRef.current);

    return () => {
      observer.disconnect();
    };
  }, [option, onClick, theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreenChart(
        Boolean(chartRef.current && document.fullscreenElement?.contains(chartRef.current)),
      );
      window.requestAnimationFrame(() => instanceRef.current?.resize());
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    syncFullscreenState();

    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: 320,
        ...style,
        ...(isFullscreenChart ? { height: '100%', minHeight: 0 } : {}),
      }}
      className={className}
    />
  );
}
