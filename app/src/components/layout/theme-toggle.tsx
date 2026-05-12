'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type ThemeMode = 'dark' | 'light';

const storageKey = 'polibeli-dashboard-theme';

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
  window.dispatchEvent(new CustomEvent('dashboard-theme-change', { detail: { theme } }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      const nextTheme: ThemeMode = stored === 'light' ? 'light' : 'dark';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  }

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={cn(
        'group inline-flex h-9 items-center gap-2 rounded-[8px] border px-2.5 text-xs font-semibold transition-all',
        isLight
          ? 'border-amber-300/70 bg-amber-50 text-amber-700 shadow-sm shadow-amber-200/50 hover:border-amber-400'
          : 'border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span className="relative flex h-5 w-9 items-center rounded-full border border-current/20 bg-background/70 p-0.5">
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform',
            isLight ? 'translate-x-4 bg-amber-500 text-white' : 'translate-x-0',
          )}
        >
          {isLight ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        </span>
      </span>
      <span className="hidden sm:inline">{isLight ? 'Light' : 'Dark'}</span>
    </button>
  );
}
