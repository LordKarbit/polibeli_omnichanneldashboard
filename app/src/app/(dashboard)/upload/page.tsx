'use client';

import { useState } from 'react';
import { ChartCard } from '@/components/ui/chart-card';
import { recentUploads } from '@/data/mock/data-quality';
import { uploadProcessingSteps } from '@/data/mock/phase-completion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const sourceOptions = [
  { value: 'b2b', label: 'B2B GT/MT', description: 'raw_dashboard.xlsx or CSV export', color: '#06b6d4' },
  { value: 'shopee', label: 'Shopee', description: 'Order.all export from Shopee Seller Center', color: '#f97316' },
  { value: 'tiktok1', label: 'TikTok Shop (Kayou ID)', description: 'All order CSV from TikTok Shop', color: '#ef4444' },
  { value: 'tiktok2', label: 'TikTok Shop (Kayou Card ID)', description: 'All order CSV from TikTok Shop', color: '#ec4899' },
];

const statusIcons = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
  processing: <Clock className="h-4 w-4 text-amber-500 animate-spin" />,
};

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSource, setSelectedSource] = useState('b2b');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Simulation: file dropped
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      
      {/* Upload Zone & Progress Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Dropzone */}
        <div 
          className={cn(
            "col-span-2 rounded-xl border-2 border-dashed bg-card p-8 transition-all",
            isDragging ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border hover:border-primary/30"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
              isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"
            )}>
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Upload Raw Data Files</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag & drop your CSV or Excel files here, or click to browse
              </p>
            </div>

            {/* Source selector cards */}
            <div className="mt-4 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
              {sourceOptions.map((source) => (
                <button
                  key={source.value}
                  onClick={() => setSelectedSource(source.value)}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:bg-primary/5",
                    selectedSource === source.value 
                      ? "border-primary bg-primary/10 shadow-sm" 
                      : "border-border bg-muted/30 hover:border-primary/30"
                  )}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors bg-background"
                    style={{ border: `1px solid ${source.color}30` }}
                  >
                    <FileSpreadsheet className="h-5 w-5" style={{ color: source.color }} />
                  </div>
                  <span className={cn(
                    "text-xs font-semibold",
                    selectedSource === source.value ? "text-primary" : "text-foreground"
                  )}>{source.label}</span>
                </button>
              ))}
            </div>

            <button className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Select Files
            </button>
          </div>
        </div>

        {/* Processing Progress */}
        <div className="flex flex-col rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Processing Pipeline
          </h3>
          <div className="relative flex-1">
            <div className="absolute left-3 top-2 bottom-4 w-px bg-border"></div>
            <div className="space-y-4 relative">
              {uploadProcessingSteps.map((step, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-card transition-all">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium text-foreground">{step.step}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Processing Info & Schema Detection */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">4</p>
              <p className="text-xs text-muted-foreground">Files Processed</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5.897</p>
              <p className="text-xs text-muted-foreground">Total Line Items</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">28</p>
              <p className="text-xs text-muted-foreground">Issues Found</p>
            </div>
          </div>
        </div>
        
        {/* Schema Detection Card */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Schema Detection</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground">Required Columns</span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px]">100% Match</Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground">Data Types</span>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 text-[10px]">2 Warnings</Badge>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 w-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <ChartCard title="Recent Uploads" subtitle="Upload history and processing status">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">File Name</th>
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4 text-right">Rows</th>
                <th className="pb-3 pr-4 text-right">Issues</th>
                <th className="pb-3 text-right">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {recentUploads.map((upload) => (
                <tr key={upload.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">{statusIcons[upload.status]}</td>
                  <td className="max-w-[250px] truncate py-3 pr-4 font-medium text-foreground" title={upload.fileName}>
                    {upload.fileName}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="secondary" className="text-xs">{upload.source}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-right text-foreground">{upload.rows.toLocaleString('id-ID')}</td>
                  <td className="py-3 pr-4 text-right">
                    {upload.issues > 0 ? (
                      <span className="text-amber-500">{upload.issues}</span>
                    ) : (
                      <span className="text-emerald-500">0</span>
                    )}
                  </td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{upload.uploadedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
