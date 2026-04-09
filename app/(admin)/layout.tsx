import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    notFound();
  }

  return (
    <div className="flex min-h-svh">
      <AdminSidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
