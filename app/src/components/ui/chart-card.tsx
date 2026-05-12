'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import { downloadCSV } from '@/lib/download';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  action?: React.ReactNode;
  onDownload?: () => void;
}

export function ChartCard({ title, subtitle, children, className, contentClassName, action, onDownload }: ChartCardProps) {
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
        ctx.fillStyle = document.documentElement.classList.contains('light') ? '#ffffff' : '#0e1726';
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-[8px] border border-border bg-card shadow-sm shadow-black/10 transition-all duration-300 hover:border-primary/15',
        'flex flex-col',
        isFullscreen ? 'fixed inset-0 z-50 m-0 h-screen w-screen rounded-none' : '',
        className
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
          {action ? <div className="min-w-0 flex-1 sm:flex-none">{action}</div> : null}
          <button 
            onClick={handleDownload}
            title="Export to PNG/CSV"
            className="rounded-md p-1.5 text-muted-foreground opacity-100 transition-all hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Maximize"}
            className="rounded-md p-1.5 text-muted-foreground opacity-100 transition-all hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={cn(
        "flex-1 overflow-auto p-4 sm:p-5",
        isFullscreen ? "flex items-center justify-center p-4 sm:p-8 [&>div]:h-full [&>div]:w-full" : "",
        contentClassName,
      )}>
        {children}
      </div>
    </div>
  );
}
