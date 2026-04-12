"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/auth-client";
import {
  RiDashboardLine,
  RiUserLine,
  RiSettings3Line,
  RiLogoutBoxLine,
  RiMenuLine,
  RiCloseLine,
  RiFolderLine,
  RiStore2Line,
  RiFileList3Line,
  RiMoneyDollarCircleLine,
  RiBookmarkLine,
  RiBankCardLine,
} from "@remixicon/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: RiDashboardLine },
  { href: "/dashboard/collections", label: "Collections", icon: RiFolderLine },
  { href: "/dashboard/users", label: "Users", icon: RiUserLine },
  { href: "/dashboard/settings", label: "Settings", icon: RiSettings3Line },
];

const procurementItems = [
  { href: "/dashboard/procurement/vendors", label: "Vendors", icon: RiStore2Line },
  { href: "/dashboard/procurement/procurements", label: "Procurements", icon: RiFileList3Line },
  { href: "/dashboard/procurement/budgets", label: "Budgets", icon: RiMoneyDollarCircleLine },
  { href: "/dashboard/procurement/obligations", label: "Obligations", icon: RiBookmarkLine },
  { href: "/dashboard/procurement/payments", label: "Payments", icon: RiBankCardLine },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleSignOut = () => {
    signOut();
    router.refresh()
  };

  const sidebar = (
    <div className="flex h-full flex-col justify-between py-4">
      <div className="space-y-1 px-3">
        <div className="mb-6 px-3">
          <h2 className="text-lg font-semibold tracking-tight">PM Admin</h2>
          <p className="text-xs text-muted-foreground">Project Management</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Procurement</p>
          </div>
          {procurementItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="px-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleSignOut}
        >
          <RiLogoutBoxLine className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 border-b bg-background px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <RiCloseLine className="size-5" />
          ) : (
            <RiMenuLine className="size-5" />
          )}
        </Button>
        <span className="font-semibold">PM Admin</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-56 border-r bg-background transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>
    </>
  );
}
