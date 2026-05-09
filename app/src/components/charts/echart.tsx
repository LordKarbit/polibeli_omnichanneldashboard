'use client';

import { useRef, useEffect } from 'react';
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
}

export function EChart({ option, style, className }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    }

    instanceRef.current.setOption(option, true);

    // Resize observer
    const observer = new ResizeObserver(() => {
      instanceRef.current?.resize();
    });
    observer.observe(chartRef.current);

    return () => {
      observer.disconnect();
    };
  }, [option]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: 320, ...style }}
      className={className}
    />
  );
}
