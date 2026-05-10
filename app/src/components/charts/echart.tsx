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

export function EChart({ option, style, className, onClick }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    }

    instanceRef.current.setOption(option, true);
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
  }, [option, onClick]);

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
