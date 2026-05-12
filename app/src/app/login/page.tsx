import { redirect } from "next/navigation";

import { LoginClient } from "./login-client";
import { getCurrentSession } from "@/server/security";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session?.user?.id) {
    redirect("/");
  }

  return <LoginClient />;
}
