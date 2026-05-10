'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { dataQualityMetrics, dataQualitySummary } from '@/data/mock/data-quality';
import { duplicateOrders, zeroValueItems, schemaMismatches } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { useDashboardData } from '@/lib/dashboard-client';

type QualityMetric = { category: string; count: number; severity: 'error' | 'warning' | 'info'; description: string };
type QualitySummary = { totalRows: number; validPercent: number; criticalIssues: number; warningIssues: number; infoIssues?: number };

// Issues by category bar
function getIssuesBarOption(metrics: QualityMetric[]): EChartsOption {
  const sorted = [...metrics].sort((a, b) => b.count - a.count);
  const severityColors: Record<string, string> = {
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((m) => m.category),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((m) => ({
          value: m.count,
          itemStyle: {
            color: severityColors[m.severity],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: '55%',
      },
    ],
  });
}

// Severity donut
function getSeverityDonutOption(summary: QualitySummary): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
        },
        data: [
          { value: summary.criticalIssues, name: 'Critical', itemStyle: { color: '#ef4444' } },
          { value: summary.warningIssues, name: 'Warning', itemStyle: { color: '#f59e0b' } },
          { value: summary.infoIssues ?? 0, name: 'Info', itemStyle: { color: '#3b82f6' } },
        ],
      },
    ],
  });
}

export default function DataQualityPage() {
  const { data } = useDashboardData();
  const summary = data?.dataQuality
    ? {
        totalRows: data.dataQuality.totalRows,
        validPercent: data.dataQuality.validPercent,
        criticalIssues: data.dataQuality.criticalIssues,
        warningIssues: data.dataQuality.warningIssues,
        infoIssues: data.dataQuality.infoIssues,
      }
    : dataQualitySummary;
  const metrics = data?.dataQuality?.metrics ?? dataQualityMetrics;
  const zeroItems = data?.dataQuality?.zeroValueItems ?? zeroValueItems;
  const schemaIssues = data?.dataQuality?.schemaMismatches ?? schemaMismatches;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="Total Rows"
          value={summary.totalRows.toLocaleString('id-ID')}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <KPICard
          label="Valid Rows"
          value={`${summary.validPercent}%`}
          change={0.3}
          changeLabel="improvement"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KPICard
          label="Critical Issues"
          value={summary.criticalIssues.toString()}
          icon={<XCircle className="h-5 w-5" />}
        />
        <KPICard
          label="Warnings"
          value={summary.warningIssues.toString()}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          title="Issues by Category"
          subtitle="Count per data quality rule"
          className="lg:col-span-3"
        >
          <EChart option={getIssuesBarOption(metrics)} style={{ height: 350 }} />
        </ChartCard>

        <ChartCard
          title="Severity Breakdown"
          subtitle="Critical vs Warning vs Info"
          className="lg:col-span-2"
        >
          <EChart option={getSeverityDonutOption(summary)} style={{ height: 350 }} />
        </ChartCard>
      </div>

      {/* Duplicate Order Table */}
      <ChartCard title="Duplicate Order Detection" subtitle="Orders appearing multiple times across uploads">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Order ID</th>
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4 text-right">Occurrences</th>
                <th className="pb-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {duplicateOrders.map((d) => (
                <tr key={d.orderId} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 font-mono text-xs text-foreground">{d.orderId}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{d.source}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">{d.occurrences}x</span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">{d.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Zero-Value Item Table */}
      <ChartCard title="Zero-Value Line Items" subtitle="Marketplace items with Rp 0 value — likely gifts/bundles/freebies">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4">Product Name</th>
                <th className="pb-3 pr-4 text-right">Line Items</th>
                <th className="pb-3 text-right">Total Qty</th>
              </tr>
            </thead>
            <tbody>
              {zeroItems.map((z, i) => (
                <tr key={`${z.source}-${i}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{z.source}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{z.productName}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{z.count.toLocaleString('id-ID')}</td>
                  <td className="py-3 text-right text-foreground">{z.totalQty.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border">
                <td colSpan={2} className="py-3 pr-4 font-semibold text-foreground">Total Zero-Value Items</td>
                <td className="py-3 pr-4 text-right font-bold text-amber-500">{zeroItems.reduce((s, z) => s + z.count, 0).toLocaleString('id-ID')}</td>
                <td className="py-3 text-right font-bold text-foreground">{zeroItems.reduce((s, z) => s + z.totalQty, 0).toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Schema Mismatch Table */}
      <ChartCard title="Schema Mismatch & Parsing Issues" subtitle="Column-level issues detected during file parsing">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3 pr-4">File</th>
                <th className="pb-3 pr-4">Field</th>
                <th className="pb-3">Issue</th>
              </tr>
            </thead>
            <tbody>
              {schemaIssues.map((s, i) => (
                <tr key={`${s.file}-${s.field}-${i}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                      s.severity === 'error' ? 'bg-destructive/10 text-destructive'
                      : s.severity === 'warning' ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {s.severity}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate py-3 pr-4 font-mono text-xs text-muted-foreground" title={s.file}>{s.file}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{s.field}</td>
                  <td className="py-3 text-xs text-muted-foreground">{s.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Issues Detail Table */}
      <ChartCard title="Data Quality Issues" subtitle="All detected issues with descriptions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4 text-right">Count</th>
                <th className="pb-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.category} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                        metric.severity === 'error'
                          ? 'bg-destructive/10 text-destructive'
                          : metric.severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {metric.severity}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium text-foreground">{metric.category}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{metric.count.toLocaleString('id-ID')}</td>
                  <td className="py-3 text-muted-foreground">{metric.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
