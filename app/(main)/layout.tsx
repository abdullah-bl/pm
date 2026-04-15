import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserShell } from "@/components/user-shell";

const STAFF_ROLES = ["admin", "viewer", "procurement_manager", "budget_manager"];

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  // Redirect staff users to the admin dashboard
  if (STAFF_ROLES.includes(session.user.role ?? "user")) {
    return redirect("/dashboard");
  }

  return (
    <UserShell
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </UserShell>
  );
}
