import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserShell } from "@/components/user-shell";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  // Redirect admin users to the admin dashboard
  if(session.user.role === "admin") {
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
