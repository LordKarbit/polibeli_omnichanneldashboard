import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db, schema } from "@/server/db";

const configuredBaseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL;

const localOrigins = [
  ...Array.from({ length: 31 }, (_, index) => `http://localhost:${3000 + index}`),
  ...Array.from({ length: 31 }, (_, index) => `http://127.0.0.1:${3000 + index}`),
];

const envTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const envAllowedHosts = (process.env.BETTER_AUTH_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const baseURL = configuredBaseURL ?? {
  allowedHosts: ["localhost", "127.0.0.1", ...envAllowedHosts],
  fallback: "http://localhost:3000",
};

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build"
    ? undefined
    : "dev-only-change-me-omnichannel-dashboard");

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is required in production.");
}

export const auth = betterAuth({
  baseURL,
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "gt_mt",
      },
    },
  },
  trustedOrigins: () => [
    ...(configuredBaseURL ? [configuredBaseURL] : []),
    ...localOrigins,
    ...envTrustedOrigins,
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
