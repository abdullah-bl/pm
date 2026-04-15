"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBudget,
  createBudgetYear,
  listBudgets,
  getBudgetWithYears,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { OverviewCards } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import {
  RiAddLine,
  RiCloseLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiMoneyDollarCircleLine,
  RiWalletLine,
  RiPieChartLine,
  RiBankLine,
} from "@remixicon/react";

type Budget = {
  id: string;
  name: string;
  referenceNumber: string;
  economicCode: string;
  createdAt: number;
};

type BudgetYearType = {
  id: string;
  budgetId: string;
  year: number;
  cash: number;
  credit: number;
  consumedCash: number;
  consumedCredit: number;
  status: string;
};

type BudgetWithYears = Budget & { years: BudgetYearType[] };

const yearStatusColors: Record<string, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  frozen: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithYears[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBudget, setExpandedBudget] = useState<string | null>(null);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [yearTargetBudget, setYearTargetBudget] = useState<string>("");

  const load = useCallback(async () => {
    const listRes = await listBudgets({});
    if (listRes?.data) {
      const budgetsList = listRes.data as unknown as Budget[];
      const withYears: BudgetWithYears[] = [];
      for (const b of budgetsList) {
        const res = await getBudgetWithYears({ id: b.id });
        withYears.push({ ...b, years: (res?.data as any)?.years ?? [] });
      }
      setBudgets(withYears);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets" description="Manage budgets and budget years.">
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setShowCreateBudget(true)}>
            <RiAddLine className="size-4" />
            New Budget
          </Button>
        </div>
      </PageHeader>

      {/* Overview Cards */}
      {budgets.length > 0 && (() => {
        const allYears = budgets.flatMap(b => b.years);
        const totalAllocated = allYears.reduce((s, y) => s + y.cash + y.credit, 0);
        const totalConsumed = allYears.reduce((s, y) => s + y.consumedCash + y.consumedCredit, 0);
        const totalRemaining = totalAllocated - totalConsumed;
        return (
          <OverviewCards cards={[
            { label: "Total Budgets", value: budgets.length, icon: <RiWalletLine className="size-4 text-muted-foreground" /> },
            { label: "Total Allocated", value: formatCurrency(totalAllocated), icon: <RiBankLine className="size-4 text-muted-foreground" /> },
            { label: "Total Consumed", value: formatCurrency(totalConsumed), icon: <RiPieChartLine className="size-4 text-muted-foreground" /> },
            { label: "Total Remaining", value: formatCurrency(totalRemaining), icon: <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" /> },
          ]} />
        );
      })()}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <RiMoneyDollarCircleLine className="mx-auto size-8 mb-2 opacity-50" />
          <p className="text-sm">No budgets yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const isExpanded = expandedBudget === b.id;
            return (
              <div key={b.id} className="rounded-lg border bg-card">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedBudget(isExpanded ? null : b.id)}
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <RiArrowUpSLine className="size-5 text-muted-foreground" />
                    ) : (
                      <RiArrowDownSLine className="size-5 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <p className="font-semibold">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.referenceNumber} · Code: {b.economicCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{b.years.length} year{b.years.length !== 1 ? "s" : ""}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setYearTargetBudget(b.id);
                        setShowCreateYear(true);
                      }}
                    >
                      <RiAddLine className="size-3.5" /> Add Year
                    </Button>
                  </div>
                </button>
                {isExpanded && b.years.length > 0 && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Consumed Cash</TableHead>
                          <TableHead>Consumed Credit</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {b.years.map((y) => {
                          const remainingCash = y.cash - y.consumedCash;
                          const remainingCredit = y.credit - y.consumedCredit;
                          return (
                            <TableRow key={y.id}>
                              <TableCell className="font-medium">{y.year}</TableCell>
                              <TableCell>{formatCurrency(y.cash)}</TableCell>
                              <TableCell>{formatCurrency(y.credit)}</TableCell>
                              <TableCell>{formatCurrency(y.consumedCash)}</TableCell>
                              <TableCell>{formatCurrency(y.consumedCredit)}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-xs">Cash: {formatCurrency(remainingCash)}</div>
                                  <div className="text-xs">Credit: {formatCurrency(remainingCredit)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${yearStatusColors[y.status] ?? ""}`}>
                                  {y.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <a href={`/dashboard/procurement/budgets/years/${y.id}`}>
                                  <Button variant="ghost" size="sm">View</Button>
                                </a>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {isExpanded && b.years.length === 0 && (
                  <div className="border-t p-6 text-center text-sm text-muted-foreground">
                    No budget years. Add one above.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Budget Modal */}
      {showCreateBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateBudget(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Budget</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateBudget(false)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <CreateBudgetForm
              onSubmit={async (data) => {
                const res = await createBudget(data);
                if (res?.data) {
                  toast.success("Budget created");
                  setShowCreateBudget(false);
                  load();
                } else {
                  toast.error(res?.serverError || "Failed to create budget");
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Create Budget Year Modal */}
      {showCreateYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateYear(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Budget Year</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateYear(false)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <CreateBudgetYearForm
              onSubmit={async (data) => {
                const res = await createBudgetYear({ ...data, budgetId: yearTargetBudget });
                if (res?.data) {
                  toast.success("Budget year added");
                  setShowCreateYear(false);
                  load();
                } else {
                  toast.error(res?.serverError || "Failed to add budget year");
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CreateBudgetForm({ onSubmit }: { onSubmit: (data: { name: string; referenceNumber: string; economicCode: string }) => Promise<void> }) {
  const [form, setForm] = useState({ name: "", referenceNumber: "", economicCode: "" });
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(form);
        setSubmitting(false);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Name *</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Reference Number *</label>
        <Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Economic Code *</label>
        <Input value={form.economicCode} onChange={(e) => setForm({ ...form, economicCode: e.target.value })} required />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => onSubmit(form).then(() => {})}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "..." : "Create"}</Button>
      </div>
    </form>
  );
}

function CreateBudgetYearForm({ onSubmit }: { onSubmit: (data: { year: number; cash: number; credit: number }) => Promise<void> }) {
  const [form, setForm] = useState({ year: new Date().getFullYear(), cash: "0", credit: "0" });
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit({
          year: parseInt(form.year.toString()),
          cash: parseFloat(form.cash) || 0,
          credit: parseFloat(form.credit) || 0,
        });
        setSubmitting(false);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Year *</label>
        <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cash Allocation</label>
          <Input type="number" value={form.cash} onChange={(e) => setForm({ ...form, cash: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Credit Allocation</label>
          <Input type="number" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => {}}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "..." : "Add"}</Button>
      </div>
    </form>
  );
}
