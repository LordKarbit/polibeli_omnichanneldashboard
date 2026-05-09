'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import { downloadCSV } from '@/lib/download';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  onDownload?: () => void;
}

export function ChartCard({ title, subtitle, children, className, action, onDownload }: ChartCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    
    // Auto-detect canvas (ECharts)
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      // Create a temporary canvas to draw with a background color
      // since echarts canvas might be transparent
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0e1726'; // dark card background
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        
        const url = tempCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
        a.click();
        return;
      }
    }

    // Auto-detect table
    const table = containerRef.current?.querySelector('table');
    if (table) {
      const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
        Array.from(tr.querySelectorAll('th, td')).map(td => (td as HTMLElement).innerText.trim())
      );
      if (rows.length > 0) {
        downloadCSV(title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), rows[0], rows.slice(1));
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen change to update state
  if (typeof window !== 'undefined') {
    document.onfullscreenchange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/10',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen m-0' : '',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action}
          <button 
            onClick={handleDownload}
            title="Export to PNG/CSV"
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={cn(
        "p-5 flex-1 overflow-auto",
        isFullscreen ? "flex items-center justify-center p-8 [&>div]:h-full [&>div]:w-full" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
