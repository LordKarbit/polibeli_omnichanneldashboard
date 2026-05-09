'use client';

/**
 * Download utility for CSV export from table data or chart data.
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download chart image as PNG from ECharts instance.
 */
export function downloadChartPNG(chartRef: { getEchartsInstance: () => { getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string } } | null, filename: string) {
  if (!chartRef) return;
  try {
    const instance = chartRef.getEchartsInstance();
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0e1726' });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // silently fail if chart not ready
  }
}
