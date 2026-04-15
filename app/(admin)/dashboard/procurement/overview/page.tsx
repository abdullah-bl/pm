"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  listProcurements,
  getProcurementYearlyOverview,
  listBudgetYears,
} from "@/lib/actions/procurement";
import { formatCurrency } from "@/lib/formatters";
import { OverviewCards } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import {
  RiArrowRightLine,
  RiFileList3Line,
  RiArchiveLine,
  RiCheckDoubleLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";

type Procurement = {
  id: string;
  referenceNumber: string;
  name: string;
  status: string;
  type: string;
  awardedAmount: number | null;
  vendorName: string | null;
};

type YearlyOverview = {
  totalCash: number;
  totalCredit: number;
  totalConsumedCash: number;
  totalConsumedCredit: number;
  remainingCash: number;
  remainingCredit: number;
  totalReserved: number;
  totalPaid: number;
};

export default function ProcurementOverviewPage() {
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [yearlyOverview, setYearlyOverview] = useState<YearlyOverview | null>(null);

  useEffect(() => {
    async function load() {
      const [procRes, yearsRes] = await Promise.all([
        listProcurements({}),
        listBudgetYears({}),
      ]);
      if (procRes?.data) setProcurements((procRes.data as any).procurements ?? []);
      if (yearsRes?.data) {
        const years = [...new Set((yearsRes.data as any[]).map((y: any) => y.year))].sort((a, b) => b - a);
        setAvailableYears(years);
        if (years.length > 0) setSelectedYear(years[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadOverview() {
      const res = await getProcurementYearlyOverview({ year: selectedYear });
      if (res?.data) setYearlyOverview(res.data as unknown as YearlyOverview);
    }
    loadOverview();
  }, [selectedYear]);

  // Overview stats
  const totalProcurements = procurements.length;
  const activeCount = procurements.filter(p => !["completed", "cancelled"].includes(p.status)).length;
  const completedCount = procurements.filter(p => p.status === "completed").length;
  const totalAwarded = procurements.reduce((sum, p) => sum + (p.awardedAmount ?? 0), 0);

  // Recent procurements (last 5)
  const recentProcurements = procurements.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Procurement Overview" 
        description="Read-only overview of procurement activities."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Procurement", href: "/dashboard/procurement" },
          { label: "Overview" },
        ]}
      >
        <Link href="/procurement">
          <Button variant="outline" className="gap-2">
            <RiFileList3Line className="size-4" />
            Manage Procurements
          </Button>
        </Link>
      </PageHeader>

      {/* Overview Cards */}
      <OverviewCards cards={[
        { label: "Total Procurements", value: totalProcurements, icon: <RiFileList3Line className="size-4 text-muted-foreground" /> },
        { label: "Active", value: activeCount, description: "In progress", icon: <RiArchiveLine className="size-4 text-muted-foreground" /> },
        { label: "Total Awarded", value: formatCurrency(totalAwarded), icon: <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" /> },
        { label: "Completed", value: completedCount, icon: <RiCheckDoubleLine className="size-4 text-muted-foreground" /> },
      ]} />

      {/* Yearly Overview */}
      {availableYears.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Yearly Budget Overview</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {yearlyOverview && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Total Budget</span>
                  <div className="text-2xl font-bold">{formatCurrency(yearlyOverview.totalCash + yearlyOverview.totalCredit)}</div>
                  <p className="text-xs text-muted-foreground">Cash: {formatCurrency(yearlyOverview.totalCash)} · Credit: {formatCurrency(yearlyOverview.totalCredit)}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Consumed</span>
                  <div className="text-2xl font-bold">{formatCurrency(yearlyOverview.totalConsumedCash + yearlyOverview.totalConsumedCredit)}</div>
                  <p className="text-xs text-muted-foreground">Cash: {formatCurrency(yearlyOverview.totalConsumedCash)} · Credit: {formatCurrency(yearlyOverview.totalConsumedCredit)}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Reserved (Obligations)</span>
                  <div className="text-2xl font-bold">{formatCurrency(yearlyOverview.totalReserved)}</div>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Cash Remaining</span>
                  <div className="text-2xl font-bold">{formatCurrency(yearlyOverview.remainingCash)}</div>
                </div>
              </div>
              {/* Progress bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Cash consumed</span>
                    <span>{yearlyOverview.totalCash > 0 ? Math.round((yearlyOverview.totalConsumedCash / yearlyOverview.totalCash) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${yearlyOverview.totalCash > 0 ? Math.min((yearlyOverview.totalConsumedCash / yearlyOverview.totalCash) * 100, 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Credit consumed</span>
                    <span>{yearlyOverview.totalCredit > 0 ? Math.round((yearlyOverview.totalConsumedCredit / yearlyOverview.totalCredit) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${yearlyOverview.totalCredit > 0 ? Math.min((yearlyOverview.totalConsumedCredit / yearlyOverview.totalCredit) * 100, 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recent Procurements */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">Recent Procurements</h2>
        {recentProcurements.length > 0 ? (
          <div className="space-y-3">
            {recentProcurements.map((p) => (
              <Link
                key={p.id}
                href={`/procurement/${p.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.referenceNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="capitalize">{p.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.status === "completed" ? "bg-green-100 text-green-700" :
                    p.status === "active" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {p.status.replace(/_/g, " ")}
                  </span>
                  <span>{formatCurrency(p.awardedAmount) || "—"}</span>
                  <RiArrowRightLine className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No procurements yet</p>
        )}
      </div>
    </div>
  );
}
