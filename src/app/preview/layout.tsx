import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requirePermissionFromSessionCookie } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Staff content preview",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("melagri_session")?.value;
  const auth = await requirePermissionFromSessionCookie(session, "marketing.manage");
  if (!auth.ok) {
    if (auth.message?.includes("Missing required permission") || auth.uid) {
      redirect("/dashboard/admin");
    }
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/preview/home")}`);
  }

  return <>{children}</>;
}
