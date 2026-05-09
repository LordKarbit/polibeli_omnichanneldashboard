'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({ label, value, change, changeLabel, icon, className }: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = !change || change === 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5',
        className
      )}
    >
      {/* Gradient accent line at top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                  isPositive && label.includes('Cancel') ? 'bg-destructive/10 text-destructive' : '',
                  isPositive && !label.includes('Cancel') ? 'bg-emerald-500/10 text-emerald-500' : '',
                  isNegative && label.includes('Cancel') ? 'bg-emerald-500/10 text-emerald-500' : '',
                  isNegative && !label.includes('Cancel') ? 'bg-destructive/10 text-destructive' : '',
                  isNeutral ? 'bg-muted text-muted-foreground' : '',
                )}
              >
                {isPositive && <TrendingUp className="h-3 w-3" />}
                {isNegative && <TrendingDown className="h-3 w-3" />}
                {isNeutral && <Minus className="h-3 w-3" />}
                {change > 0 ? '+' : ''}{change}%
              </div>
              {changeLabel && (
                <span className="text-[10px] text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
