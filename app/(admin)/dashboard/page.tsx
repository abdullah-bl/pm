"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDashboardStatsAction } from "@/lib/actions/users";
import { listProcurements, getOverduePayments } from "@/lib/actions/procurement";
import { formatCurrency } from "@/lib/formatters";
import {
  RiUserLine,
  RiShieldKeyholeLine,
  RiFolderLine,
  RiAddLine,
  RiSettings3Line,
  RiTimeLine,
  RiFileList3Line,
  RiBankCardLine,
  RiMoneyDollarCircleLine,
  RiErrorWarningLine,
} from "@remixicon/react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeSessions: number;
    collections: number;
    tasks: number;
  } | null>(null);

  const [procurementStats, setProcurementStats] = useState<{
    activeProcurements: number;
    pendingPayments: number;
    overduePayments: number;
  } | null>(null);

  useEffect(() => {
    getDashboardStatsAction({}).then((res) => {
      if (res?.data) setStats(res.data);
    });
  }, []);

  useEffect(() => {
    async function loadProcurementStats() {
      const [procRes, overdueRes] = await Promise.all([
        listProcurements({}),
        getOverduePayments({}),
      ]);
      if (procRes?.data) {
        const procs = (procRes.data as any).procurements ?? procRes.data;
        const activeStatuses = ["draft", "published", "offers_open", "evaluation", "awarded", "contract_active"];
        const active = (procs as any[]).filter((p: any) => activeStatuses.includes(p.status));
        setProcurementStats((prev) => ({
          ...prev!,
          activeProcurements: active.length,
        }));
      }
      if (overdueRes?.data) {
        setProcurementStats((prev) => ({
          ...prev!,
          overduePayments: (overdueRes.data as any[]).length,
          pendingPayments: prev?.pendingPayments ?? 0,
        }));
      }
    }
    loadProcurementStats();
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
      label: "Collections",
      value: stats?.collections ?? "—",
      icon: RiFolderLine,
      description: "Active collections",
    },
    {
      label: "Tasks",
      value: stats?.tasks ?? "—",
      icon: RiAddLine,
      description: "Total tasks",
    },
  ];

  const procurementCards = [
    {
      label: "Active Procurements",
      value: procurementStats?.activeProcurements ?? "—",
      icon: RiFileList3Line,
      description: "In progress",
      href: "/dashboard/procurement/overview",
    },
    {
      label: "Pending Payments",
      value: procurementStats?.pendingPayments ?? "—",
      icon: RiBankCardLine,
      description: "Awaiting approval",
      href: "/dashboard/procurement/payments",
    },
    {
      label: "Overdue Payments",
      value: procurementStats?.overduePayments ?? "—",
      icon: RiErrorWarningLine,
      description: "Past due date",
      href: "/dashboard/procurement/payments",
      valueClassName: procurementStats?.overduePayments ? "text-red-500" : undefined,
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

      {/* Core Stats */}
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

      {/* Procurement Stats */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Procurement Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {procurementCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <div className="rounded-lg border bg-card p-6 space-y-2 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </span>
                  <card.icon className="size-4 text-muted-foreground" />
                </div>
                <div className={`text-3xl font-bold ${card.valueClassName ?? ""}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/users">
            <Button variant="outline" size="sm" className="gap-2">
              <RiUserLine className="size-4" />
              View All Users
            </Button>
          </Link>
          <Link href="/dashboard/procurement/overview">
            <Button variant="outline" size="sm" className="gap-2">
              <RiFileList3Line className="size-4" />
              Procurement Overview
            </Button>
          </Link>
          <Link href="/dashboard/procurement/budgets">
            <Button variant="outline" size="sm" className="gap-2">
              <RiMoneyDollarCircleLine className="size-4" />
              Budgets
            </Button>
          </Link>
          <Link href="/dashboard/settings">
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
