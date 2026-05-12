'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Loader2 } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '/': 'Executive Overview',
  '/gt': 'GT Performance',
  '/mt': 'MT / Agency',
  '/marketplace': 'Marketplace',
  '/income': 'Income & Settlement',
  '/sku': 'SKU & Product',
  '/geo': 'Geo Sales',
  '/operations': 'Operations',
  '/customers': 'Customers',
  '/upload': 'Upload Center',
  '/data-quality': 'Data Quality',
  '/ai': 'AI Insight Center',
};

function cleanLabel(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || 'Dashboard';
}

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationActive = useRef(false);
  const routeSettled = useRef(false);
  const dataPending = useRef(false);
  const [visible, setVisible] = useState(false);
  const [targetLabel, setTargetLabel] = useState(routeLabels[pathname] ?? 'Dashboard');
  const [status, setStatus] = useState('Membuka menu');

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  }, []);

  const finishWhenReady = useCallback(() => {
    if (!navigationActive.current || !routeSettled.current || dataPending.current) return;

    const elapsed = Date.now() - startedAt.current;
    const delay = Math.max(120, 420 - elapsed);

    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      navigationActive.current = false;
      setVisible(false);
      hideTimer.current = null;
    }, delay);
  }, [clearHideTimer]);

  const showOverlay = useCallback((label: string, nextStatus = 'Membuka menu') => {
    clearHideTimer();
    clearSettleTimer();
    navigationActive.current = true;
    routeSettled.current = false;
    dataPending.current = false;
    startedAt.current = Date.now();
    setTargetLabel(cleanLabel(label));
    setStatus(nextStatus);
    setVisible(true);
  }, [clearHideTimer, clearSettleTimer]);

  const settleRouteSoon = useCallback((delay = 180) => {
    clearSettleTimer();
    settleTimer.current = setTimeout(() => {
      routeSettled.current = true;
      settleTimer.current = null;
      finishWhenReady();
    }, delay);
  }, [clearSettleTimer, finishWhenReady]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (currentPath === nextPath) return;

      showOverlay(anchor.textContent || routeLabels[nextUrl.pathname] || 'Dashboard', 'Mempersiapkan halaman');
    }

    function handlePopState() {
      showOverlay(routeLabels[window.location.pathname] ?? 'Dashboard', 'Membuka riwayat halaman');
      settleRouteSoon(220);
    }

    window.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [settleRouteSoon, showOverlay]);

  useEffect(() => {
    function handleDashboardDataLoading(event: Event) {
      const loading = Boolean((event as CustomEvent<{ loading?: boolean }>).detail?.loading);

      if (loading) {
        if (navigationActive.current) {
          clearHideTimer();
          dataPending.current = true;
          setTargetLabel(routeLabels[window.location.pathname] ?? targetLabel);
          setStatus('Menyinkronkan data');
        }
        return;
      }

      if (navigationActive.current) {
        dataPending.current = false;
        setStatus('Menyusun tampilan');
        finishWhenReady();
      }
    }

    window.addEventListener('dashboard-data-loading', handleDashboardDataLoading);
    return () => window.removeEventListener('dashboard-data-loading', handleDashboardDataLoading);
  }, [clearHideTimer, finishWhenReady, targetLabel]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    setTargetLabel(routeLabels[pathname] ?? 'Dashboard');
    setStatus('Menyusun tampilan');

    settleRouteSoon(220);
  }, [pathname, settleRouteSoon]);

  useEffect(() => () => {
    clearHideTimer();
    clearSettleTimer();
  }, [clearHideTimer, clearSettleTimer]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-xl dark:bg-background/72">
      <div className="route-loading-scan pointer-events-none absolute inset-0 opacity-70 dark:opacity-45" />

      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[8px] border border-cyan-600/24 bg-white/95 p-6 text-center text-slate-950 shadow-2xl shadow-slate-900/20 dark:border-cyan-300/25 dark:bg-card/92 dark:text-foreground dark:shadow-cyan-950/30">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 dark:from-cyan-300 dark:via-indigo-300 dark:to-amber-200" />

        <div className="mx-auto flex h-28 w-28 items-center justify-center">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full border border-cyan-300/20" />
            <div className="absolute inset-2 rounded-full border border-indigo-300/15" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-300 border-r-cyan-300/70 animate-spin" />
            <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-amber-200 border-l-indigo-300/80 animate-[spin_1.65s_linear_infinite_reverse]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-cyan-500/25 bg-cyan-500/10 text-cyan-700 shadow-lg shadow-cyan-900/18 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100 dark:shadow-cyan-950/40">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-100">
          <Activity className="h-3.5 w-3.5" />
          {status}
        </div>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950 dark:text-foreground">{targetLabel}</h2>
        <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-muted-foreground">Menyiapkan insight, chart, dan data terbaru...</p>

        <div className="mt-6 overflow-hidden rounded-full border border-slate-200 bg-slate-100/80 p-1 dark:border-border dark:bg-background/70">
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-muted">
            <div className="route-loading-progress absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 dark:from-cyan-300 dark:via-indigo-300 dark:to-amber-200" />
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-100/70 px-3 py-1.5 text-xs text-slate-600 dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Menunggu halaman siap
        </div>
      </div>
    </div>
  );
}
