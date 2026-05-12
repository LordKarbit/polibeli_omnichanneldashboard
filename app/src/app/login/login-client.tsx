"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, LockKeyhole, Shield, Sparkles, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
};

async function readApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
  return payload?.error?.message ?? fallback;
}

export function LoginClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/setup/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<ApiResponse<{ hasUsers: boolean }>>)
      .then((payload) => {
        if (cancelled) return;
        setIsSetupMode(!payload.data?.hasUsers);
      })
      .catch(() => {
        if (!cancelled) setIsSetupMode(false);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSetup(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const title = isSetupMode ? "Create Command Account" : "Welcome Back";
  const subtitle = isSetupMode
    ? "Provision the first Administrator to unlock the management dashboard."
    : "Sign in to your omnichannel reporting control room.";

  const rolePreview = useMemo(
    () => [
      ["Administrator", "Full system control, user creation, and permission governance"],
      ["Head", "All business reporting except user management"],
      ["GT & MT", "GT/MT scope with customer and regional visibility"],
      ["Marketplace", "Marketplace sales, settlement, and buyer analytics"],
    ],
    [],
  );

  async function resolveLoginEmail() {
    const identifier = form.identifier.trim();
    if (identifier.includes("@")) return identifier.toLowerCase();

    const response = await fetch("/api/session/resolve-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Invalid user/email or password."));
    }

    const payload = (await response.json()) as ApiResponse<{ email: string }>;
    return payload.data?.email ?? identifier;
  }

  async function signInAfterSetup(email: string) {
    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: form.password,
        callbackURL: callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Unable to sign in."));
    }

    window.location.href = callbackUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loginEmail = isSetupMode ? form.identifier.trim().toLowerCase() : await resolveLoginEmail();

      if (isSetupMode) {
        if (!loginEmail.includes("@")) {
          throw new Error("Administrator pertama harus dibuat menggunakan email.");
        }

        const response = await fetch("/api/setup/administrator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: form.password }),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, "Unable to create administrator."));
        }
      }

      await signInAfterSetup(loginEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,oklch(0.68_0.18_245/.28),transparent_28rem),radial-gradient(circle_at_80%_8%,oklch(0.72_0.16_170/.18),transparent_30rem),linear-gradient(135deg,oklch(0.09_0.015_265),oklch(0.16_0.025_255)_45%,oklch(0.09_0.015_265))]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(oklch(1_0_0/.08)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/.08)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute -left-28 top-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl motion-safe:animate-pulse" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
        <section className="hidden min-h-[560px] flex-col justify-between rounded-[8px] border border-white/10 bg-white/[0.045] p-8 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Premium reporting access layer
            </div>
            <h1 className="mt-8 max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-white">
              Omnichannel intelligence, locked behind real governance.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              Every menu, export, upload action, and analytics response now follows role-based permissions and channel scope.
            </p>
          </div>

          <div className="grid gap-3">
            {rolePreview.map(([role, description], index) => (
              <div
                key={role}
                className="group flex items-center gap-4 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.06]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/10 bg-white/10 text-cyan-100">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{role}</p>
                  <p className="text-xs leading-5 text-slate-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center lg:min-h-0">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md overflow-hidden rounded-[8px] border border-white/10 bg-slate-950/70 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl"
          >
            <div className="border-b border-white/10 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/25">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">Omni Dashboard</p>
                  <p className="text-xs text-slate-400">Sales Analytics Workspace</p>
                </div>
              </div>

              <h2 className="mt-8 text-2xl font-semibold tracking-tight">{isCheckingSetup ? "Checking Access" : title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
            </div>

            <div className="space-y-4 p-6 sm:p-7">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <UserRound className="h-3.5 w-3.5" />
                  User / Email
                </span>
                <input
                  value={form.identifier}
                  onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
                  className="h-11 w-full rounded-[8px] border border-white/10 bg-white/[0.06] px-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15"
                  placeholder={isSetupMode ? "admin@company.com" : "name or email"}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="h-11 w-full rounded-[8px] border border-white/10 bg-white/[0.06] px-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15"
                  placeholder="Minimum 8 characters"
                  autoComplete={isSetupMode ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
              </label>

              {error && (
                <div className="rounded-[8px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isCheckingSetup || isSubmitting}
                className={cn(
                  "group flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-cyan-400 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60",
                  isSubmitting && "animate-pulse",
                )}
              >
                {isSubmitting ? "Securing session..." : isSetupMode ? "Create Admin & Enter" : "Enter Dashboard"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>

              <div className="flex items-start gap-2 rounded-[8px] border border-emerald-300/15 bg-emerald-300/10 px-3 py-3 text-xs leading-5 text-emerald-50">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>
                  Upload, wipe, export, AI, and order detail APIs are protected by the same role rules used by the interface.
                </span>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
