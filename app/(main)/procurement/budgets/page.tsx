"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listBudgetYears,
  checkProcurementAccess,
} from "@/lib/actions/procurement";
import { formatCurrency } from "@/lib/formatters";
import {
  RiMoneyDollarCircleLine,
  RiLockLine,
} from "@remixicon/react";

type BudgetYear = {
  id: string;
  budgetId: string;
  year: number;
  cash: number;
  credit: number;
  consumedCash: number;
  consumedCredit: number;
  status: string;
  budgetName: string;
  budgetRef: string;
};

function ProgressBar({ consumed, total, label }: { consumed: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min((consumed / total) * 100, 100) : 0;
  const remaining = total - consumed;
  const isOver = pct > 90;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {formatCurrency(consumed)} / {formatCurrency(total)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? "bg-red-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Remaining: {formatCurrency(remaining)}
      </p>
    </div>
  );
}

export default function UserBudgetsPage() {
  const [budgetYears, setBudgetYears] = useState<BudgetYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessRole, setAccessRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sessionRes = await fetch("/api/auth/get-session");
    const session = await sessionRes.json();

    if (session?.user?.id) {
      const accessRes = await checkProcurementAccess({ userId: session.user.id });
      if (accessRes?.data) {
        setHasAccess(accessRes.data.hasAccess as boolean);
        setAccessRole(accessRes.data.role as string | null);
      } else {
        setHasAccess(false);
      }
    }

    const res = await listBudgetYears({});
    if (res?.data) {
      setBudgetYears(res.data as unknown as BudgetYear[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">View budget data.</p>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <RiLockLine className="mx-auto size-12 mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold mb-2">No Access</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You don&apos;t have access to the procurement system. Contact an administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground">
          Budget year allocations and consumption{accessRole === "write" ? " (write access)" : " (read-only)"}.
        </p>
      </div>

      {budgetYears.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <RiMoneyDollarCircleLine className="mx-auto size-12 mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold mb-2">No Budget Years</h2>
          <p className="text-sm text-muted-foreground">No budget years have been created yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgetYears.map((by) => (
            <div
              key={by.id}
              className="rounded-lg border bg-card p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{by.budgetName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {by.year} · <span className="capitalize">{by.status}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    by.status === "open"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                      : by.status === "frozen"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {by.status}
                </span>
              </div>

              <div className="space-y-3">
                <ProgressBar
                  consumed={by.consumedCash}
                  total={by.cash}
                  label="Cash"
                />
                <ProgressBar
                  consumed={by.consumedCredit}
                  total={by.credit}
                  label="Credit"
                />
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                Ref: {by.budgetRef}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
