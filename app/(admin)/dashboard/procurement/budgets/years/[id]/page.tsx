"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBudgetYearBalances,
  closeBudgetYear,
  freezeBudgetYear,
  unfreezeBudgetYear,
  createBudgetTransfer,
  listObligationsByProcurement,
} from "@/lib/actions/procurement";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiCloseLine,
  RiLockLine,
  RiSnowyLine,
  RiLockUnlockLine as RiUnlockLine,
  RiExchangeLine,
  RiBookmarkLine,
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
  remainingCash: number;
  remainingCredit: number;
  budgetName?: string;
  economicCode?: string;
  referenceNumber?: string;
};

const statusColors: Record<string, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  frozen: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
};

export default function BudgetYearDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [budgetYear, setBudgetYear] = useState<BudgetYear | null>(null);
  const [obligations, setObligations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [otherYears, setOtherYears] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [balancesRes] = await Promise.all([
      getBudgetYearBalances({ id }),
    ]);
    
    if (balancesRes?.data) {
      const by = balancesRes.data as BudgetYear;
      
      // Get budget info and other years
      const { db } = await import("@/lib/db");
      const { budgetYear: byTable, budget } = await import("@/lib/db/schema");
      const { eq, and, ne } = await import("drizzle-orm");
      
      const [budgetInfo, otherYearsRes] = await Promise.all([
        db.select({ name: budget.name, economicCode: budget.economicCode })
          .from(budget)
          .where(eq(budget.id, by.budgetId)),
        db.select({ id: byTable.id, year: byTable.year, cash: byTable.cash, credit: byTable.credit, status: byTable.status })
          .from(byTable)
          .where(and(eq(byTable.budgetId, by.budgetId), ne(byTable.id, id)))
      ]);
      
      if (budgetInfo[0]) {
        by.budgetName = budgetInfo[0].name;
        by.economicCode = budgetInfo[0].economicCode;
      }
      
      setBudgetYear(by);
      setOtherYears(otherYearsRes);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleClose = async () => {
    if (!confirm("Are you sure you want to close this budget year?")) return;
    const res = await closeBudgetYear({ id });
    if (res?.data) {
      toast.success("Budget year closed");
      load();
    }
  };

  const handleFreeze = async () => {
    const res = await freezeBudgetYear({ id });
    if (res?.data) {
      toast.success("Budget year frozen");
      load();
    }
  };

  const handleUnfreeze = async () => {
    const res = await unfreezeBudgetYear({ id });
    if (res?.data) {
      toast.success("Budget year unfrozen");
      load();
    }
  };

  const handleTransfer = async (toBudgetYearId: string, type: string, amount: number, reason: string) => {
    const res = await createBudgetTransfer({
      fromBudgetYearId: id,
      toBudgetYearId,
      type: type as "cash" | "credit",
      amount,
      reason: reason || null,
    });
    if (res?.data) {
      toast.success("Transfer request submitted");
      setShowTransfer(false);
      load();
    } else {
      toast.error(res?.serverError || "Failed to create transfer");
    }
  };

  // Load obligations for this budget year
  useEffect(() => {
    async function loadObligations() {
      const { db } = await import("@/lib/db");
      const { obligation, procurement } = await import("@/lib/db/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      const obs = await db.select({
        id: obligation.id,
        referenceNumber: obligation.referenceNumber,
        amount: obligation.amount,
        type: obligation.type,
        status: obligation.status,
        procurementId: obligation.procurementId,
        procurementName: procurement.name,
        createdAt: obligation.createdAt,
      })
        .from(obligation)
        .innerJoin(procurement, eq(obligation.procurementId, procurement.id))
        .where(eq(obligation.budgetYearId, id))
        .orderBy(desc(obligation.createdAt));
      
      setObligations(obs);
    }
    if (budgetYear) loadObligations();
  }, [budgetYear, id]);

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded-lg border bg-card" /></div>;
  }

  if (!budgetYear) {
    return <div className="text-center text-muted-foreground py-12">Budget year not found.</div>;
  }

  const cashPercent = budgetYear.cash > 0 ? (budgetYear.consumedCash / budgetYear.cash) * 100 : 0;
  const creditPercent = budgetYear.credit > 0 ? (budgetYear.consumedCredit / budgetYear.credit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/procurement/budgets")}>
          <RiArrowLeftLine className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{budgetYear.budgetName} - {budgetYear.year}</h1>
          <p className="text-sm text-muted-foreground">
            {budgetYear.economicCode}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[budgetYear.status] ?? ""}`}>
            {budgetYear.status}
          </span>
          {budgetYear.status === "open" && (
            <>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleFreeze}>
                <RiSnowyLine className="size-3.5" /> Freeze
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleClose}>
                <RiLockLine className="size-3.5" /> Close
              </Button>
            </>
          )}
          {budgetYear.status === "frozen" && (
            <Button variant="outline" size="sm" className="gap-1" onClick={handleUnfreeze}>
              <RiUnlockLine className="size-3.5" /> Unfreeze
            </Button>
          )}
          {budgetYear.status === "open" && otherYears.some((y: any) => y.status === "open") && (
            <Button size="sm" className="gap-1" onClick={() => setShowTransfer(true)}>
              <RiExchangeLine className="size-3.5" /> Transfer
            </Button>
          )}
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cash Balance */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Cash Balance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Allocated</span>
                <span className="font-medium">{formatCurrency(budgetYear.cash)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Consumed</span>
                <span className="font-medium">{formatCurrency(budgetYear.consumedCash)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Remaining</span>
                <span>{formatCurrency(budgetYear.remainingCash)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Usage</span>
                <span>{cashPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(cashPercent, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Credit Balance */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Credit Balance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Allocated</span>
                <span className="font-medium">{formatCurrency(budgetYear.credit)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Consumed</span>
                <span className="font-medium">{formatCurrency(budgetYear.consumedCredit)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Remaining</span>
                <span>{formatCurrency(budgetYear.remainingCredit)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Usage</span>
                <span>{creditPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(creditPercent, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Obligations */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RiBookmarkLine className="size-5" />
          Obligations ({obligations.length})
        </h3>
        {obligations.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <p className="text-sm">No obligations against this budget year.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Procurement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/procurement/obligations/${o.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{o.referenceNumber}</TableCell>
                    <TableCell>{formatCurrency(o.amount)}</TableCell>
                    <TableCell className="capitalize">{o.type}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "active" ? "default" : "secondary"}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{o.procurementName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <TransferModal
          fromBudgetYearId={id}
          budgetYear={budgetYear}
          otherYears={otherYears.filter((y: any) => y.status === "open")}
          onClose={() => setShowTransfer(false)}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
}

function TransferModal({
  fromBudgetYearId,
  budgetYear,
  otherYears,
  onClose,
  onTransfer,
}: {
  fromBudgetYearId: string;
  budgetYear: BudgetYear;
  otherYears: any[];
  onClose: () => void;
  onTransfer: (toId: string, type: string, amount: number, reason: string) => void;
}) {
  const [form, setForm] = useState({
    toBudgetYearId: "",
    type: "cash",
    amount: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedYear = otherYears.find((y) => y.id === form.toBudgetYearId);

  const availableCash = form.type === "cash" ? budgetYear.remainingCash : budgetYear.cash;
  const availableCredit = form.type === "credit" ? budgetYear.remainingCredit : budgetYear.credit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transfer Funds</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <p className="text-sm font-medium">{budgetYear.budgetName} - {budgetYear.year}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Budget Year *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              value={form.toBudgetYearId}
              onChange={(e) => setForm({ ...form, toBudgetYearId: e.target.value })}
              required
            >
              <option value="">Select destination year...</option>
              {otherYears.map((y: any) => (
                <option key={y.id} value={y.id}>
                  {budgetYear.budgetName} - {y.year}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount *</label>
            <Input
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Available {form.type}: {formatCurrency(form.type === "cash" ? availableCash : availableCredit)}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              placeholder="Why transfer?"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                setSubmitting(true);
                onTransfer(form.toBudgetYearId, form.type, parseFloat(form.amount), form.reason);
                setSubmitting(false);
              }}
              disabled={!form.toBudgetYearId || !form.amount || submitting}
            >
              {submitting ? "..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
