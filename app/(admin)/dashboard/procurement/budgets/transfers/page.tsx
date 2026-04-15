"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBudgetTransfer,
  approveBudgetTransfer,
  rejectBudgetTransfer,
  listAllTransfers,
  listBudgetYears,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiAddLine,
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiArrowLeftLine,
  RiSwapLine,
} from "@remixicon/react";

type Transfer = {
  id: string;
  fromBudgetYearId: string;
  toBudgetYearId: string;
  type: string;
  amount: number;
  reason: string | null;
  status: string;
  createdAt: number;
  transferredAt: number | null;
  fromYear: number | undefined;
  fromBudgetName: string | undefined;
  toYear: number | undefined;
  toBudgetName: string | undefined;
};

type BudgetYearItem = {
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const typeColors: Record<string, string> = {
  cash: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  credit: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const res = await listAllTransfers({});
    if (res?.data) setTransfers((res.data as any).transfers ?? res.data as unknown as Transfer[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = transfers.filter((t) => {
    return statusFilter === "all" || t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/procurement/budgets">
            <Button variant="ghost" size="icon">
              <RiArrowLeftLine className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Budget Transfers
            </h1>
            <p className="text-muted-foreground">
              Transfer funds between budget years.
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine className="size-4" />
          New Transfer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  <RiSwapLine className="mx-auto size-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {statusFilter !== "all"
                      ? "No transfers match your filter."
                      : "No transfers yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">
                    <span className="font-medium">
                      {t.fromBudgetName ?? "—"}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({t.fromYear ?? "—"})
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">
                      {t.toBudgetName ?? "—"}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({t.toYear ?? "—"})
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        typeColors[t.type] ?? ""
                      }`}
                    >
                      {t.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[t.status] ?? ""
                      }`}
                    >
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {t.reason || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.transferredAt
                      ? formatDateTime(t.transferredAt)
                      : formatDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Approve"
                          className="text-green-600 hover:text-green-700"
                          onClick={async () => {
                            const res = await approveBudgetTransfer({
                              id: t.id,
                            });
                            if (res?.data) {
                              toast.success("Transfer approved");
                              load();
                            } else {
                              toast.error(
                                res?.serverError || "Failed to approve"
                              );
                            }
                          }}
                        >
                          <RiCheckLine className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reject"
                          className="text-red-600 hover:text-red-700"
                          onClick={async () => {
                            const res = await rejectBudgetTransfer({
                              id: t.id,
                            });
                            if (res?.data) {
                              toast.success("Transfer rejected");
                              load();
                            } else {
                              toast.error(
                                res?.serverError || "Failed to reject"
                              );
                            }
                          }}
                        >
                          <RiCloseCircleLine className="size-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Transfer Modal */}
      {showCreate && (
        <CreateTransferModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateTransferModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    fromBudgetYearId: "",
    toBudgetYearId: "",
    type: "cash" as string,
    amount: "",
    reason: "",
  });
  const [budgetYears, setBudgetYears] = useState<BudgetYearItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await listBudgetYears({});
      if (res?.data) setBudgetYears(res.data as BudgetYearItem[]);
      setLoadingData(false);
    }
    load();
  }, []);

  const openBudgetYears = budgetYears.filter((by) => by.status === "open");

  const fromYear = budgetYears.find((by) => by.id === form.fromBudgetYearId);
  const remainingBalance = fromYear
    ? form.type === "cash"
      ? fromYear.cash - fromYear.consumedCash
      : fromYear.credit - fromYear.consumedCredit
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Transfer</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        {loadingData ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading budget years...
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !form.fromBudgetYearId ||
                !form.toBudgetYearId ||
                form.fromBudgetYearId === form.toBudgetYearId
              )
                return;
              setSubmitting(true);
              const res = await createBudgetTransfer({
                fromBudgetYearId: form.fromBudgetYearId,
                toBudgetYearId: form.toBudgetYearId,
                type: form.type as "cash" | "credit",
                amount: parseFloat(form.amount),
                reason: form.reason || null,
              });
              if (res?.data) {
                toast.success("Transfer request created");
                onCreated();
              } else {
                toast.error(
                  res?.serverError || "Failed to create transfer"
                );
              }
              setSubmitting(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">From Budget Year *</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={form.fromBudgetYearId}
                onChange={(e) =>
                  setForm({ ...form, fromBudgetYearId: e.target.value })
                }
                required
              >
                <option value="">Select source...</option>
                {openBudgetYears.map((by) => (
                  <option key={by.id} value={by.id}>
                    {by.year} — {by.budgetName}
                  </option>
                ))}
              </select>
              {remainingBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  Remaining {form.type} balance:{" "}
                  <span className="font-medium">
                    {formatCurrency(remainingBalance)}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Budget Year *</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={form.toBudgetYearId}
                onChange={(e) =>
                  setForm({ ...form, toBudgetYearId: e.target.value })
                }
                required
              >
                <option value="">Select destination...</option>
                {openBudgetYears
                  .filter((by) => by.id !== form.fromBudgetYearId)
                  .map((by) => (
                    <option key={by.id} value={by.id}>
                      {by.year} — {by.budgetName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value })
                }
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                placeholder="Reason for transfer..."
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
