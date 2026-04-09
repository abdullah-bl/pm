"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardStatsAction } from "@/lib/actions/users";
import {
  RiUserLine,
  RiShieldKeyholeLine,
  RiFolderLine,
  RiAddLine,
  RiSettings3Line,
  RiTimeLine,
} from "@remixicon/react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeSessions: number;
    projects: number;
    tasks: number;
  } | null>(null);

  useEffect(() => {
    getDashboardStatsAction({}).then((res) => {
      if (res?.data) setStats(res.data);
    });
  }, []);

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "—",
      icon: RiUserLine,
      description: "Registered accounts",
    },
    {
      label: "Active Sessions",
      value: stats?.activeSessions ?? "—",
      icon: RiShieldKeyholeLine,
      description: "Current sessions",
    },
    {
      label: "Projects",
      value: stats?.projects ?? "—",
      icon: RiFolderLine,
      description: "Active projects",
    },
    {
      label: "Tasks",
      value: stats?.tasks ?? "—",
      icon: RiAddLine,
      description: "Total tasks",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your project management system.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border bg-card p-6 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {card.label}
              </span>
              <card.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-2">
              <RiUserLine className="size-4" />
              View All Users
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <RiSettings3Line className="size-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <RiTimeLine className="mx-auto size-8 mb-2 opacity-50" />
          <p className="text-sm">Activity tracking coming in a future phase.</p>
        </div>
      </div>
    </div>
  );
}
