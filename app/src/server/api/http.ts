import { headers } from "next/headers";

import { auth } from "@/server/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  return Response.json({ ok: false, error: { message, details } }, { status: 400 });
}

export function notFound(message: string) {
  return Response.json({ ok: false, error: { message } }, { status: 404 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  return Response.json({ ok: false, error: { message } }, { status: 500 });
}

export async function getOptionalSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch {
    return null;
  }
}

export async function readJson<T extends Record<string, unknown>>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function getLimit(searchParams: URLSearchParams, fallback = 100, max = 500) {
  const value = Number(searchParams.get("limit") ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.trunc(value), max);
}

export function parseDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
