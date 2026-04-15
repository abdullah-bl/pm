import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";

const STAFF_ROLES = ["admin", "viewer", "procurement_manager", "budget_manager"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  if (!STAFF_ROLES.includes(session.user.role ?? "user")) {
    notFound();
  }

  return (
    <div className="flex min-h-svh">
      <AdminSidebar userRole={session.user.role ?? "user"} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
