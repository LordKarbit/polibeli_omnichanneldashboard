"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsDismissed(false);
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const canInstall = useMemo(() => Boolean(installEvent && !isInstalled && !isDismissed), [installEvent, isDismissed, isInstalled]);

  if (!canInstall) return null;

  async function installApp() {
    if (!installEvent) return;

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallEvent(null);
        setIsInstalled(true);
        return;
      }
      setIsDismissed(true);
    } catch {
      setIsDismissed(true);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[calc(100vw-2rem)] max-w-[360px] rounded-[8px] border border-cyan-600/20 bg-card/96 p-3 text-foreground shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-cyan-300/25 dark:shadow-black/35">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-cyan-600/25 bg-cyan-500/10 text-cyan-700 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5">Install Polibeli Dashboard</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Buka lebih cepat dari desktop atau mobile sebagai aplikasi mandiri.
              </p>
            </div>
            <button
              type="button"
              aria-label="Tutup install prompt"
              onClick={() => setIsDismissed(true)}
              className="rounded-[8px] p-1 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={installApp}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-cyan-600/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-500/15 dark:border-cyan-300/35 dark:bg-cyan-300/14 dark:text-cyan-50 dark:hover:bg-cyan-300/22"
          >
            <Download className="h-4 w-4" />
            Install aplikasi
          </button>
        </div>
      </div>
    </div>
  );
}
