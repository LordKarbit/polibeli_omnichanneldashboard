import { auth } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = auth.handler;

export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    return Response.json(
      { ok: false, error: { message: "Public sign-up is disabled. Ask an administrator to create an account." } },
      { status: 403 },
    );
  }

  return auth.handler(request);
}
