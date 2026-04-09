import { auth } from "@/lib/auth";
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

  return (
    <UserShell
      userName={session.user.name}
      userEmail={session.user.email}
    >
      {children}
    </UserShell>
  );
}
