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
  createObligation,
  cancelObligation,
  listAllObligations,
  listProcurements,
  listBudgetYears,
} from "@/lib/actions/procurement";
import { formatCurrency } from "@/lib/formatters";
import { OverviewCards } from "@/components/overview-cards";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import {
  RiAddLine,
  RiCloseLine,
  RiBookmarkLine,
  RiMoneyDollarCircleLine,
  RiCheckDoubleLine,
  RiTimeLine,
} from "@remixicon/react";

type Obligation = {
  id: string;
  referenceNumber: string;
  amount: number;
  type: string;
  status: string;
  procurementId: string;
  budgetYearId: string;
  note: string | null;
  budgetYear?: number;
  budgetName?: string;
  procurementName?: string;
  procurementRef?: string;
  paidAmount?: number;
  remainingAmount?: number;
};

type Procurement = {
  id: string;
  name: string;
  status: string;
};

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

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [budgetYears, setBudgetYears] = useState<BudgetYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const [obsRes, procsRes, bysRes] = await Promise.all([
      listAllObligations({}),
      listProcurements({}),
      listBudgetYears({}),
    ]);

    if (obsRes?.data) {
      setObligations((obsRes.data as any).obligations ?? obsRes.data as unknown as Obligation[]);
    }
    if (procsRes?.data) {
      setProcurements(
        ((procsRes.data as any).procurements ?? procsRes.data as unknown as Procurement[]).filter(
          (p: any) => p.status === "contract_active"
        )
      );
    }
    if (bysRes?.data) {
      setBudgetYears(
        (bysRes.data as unknown as BudgetYear[]).filter((y) => y.status === "open")
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    statusFilter === "all"
      ? obligations
      : obligations.filter((o) => o.status === statusFilter);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this obligation?")) return;
    const res = await cancelObligation({ id });
    if (res?.data) {
      toast.success("Obligation cancelled");
      load();
    } else {
      toast.error(res?.serverError || "Failed to cancel obligation");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Obligations" description="Manage procurement obligations.">
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine className="size-4" />
          New Obligation
        </Button>
      </PageHeader>

      {/* Overview Cards */}
      <OverviewCards cards={[
        { label: "Total Obligations", value: obligations.length, icon: <RiBookmarkLine className="size-4 text-muted-foreground" /> },
        { label: "Active Amount", value: formatCurrency(obligations.filter(o => o.status === "active").reduce((s, o) => s + o.amount, 0)), icon: <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" /> },
        { label: "Paid Amount", value: formatCurrency(obligations.reduce((s, o) => s + (o.paidAmount ?? 0), 0)), icon: <RiCheckDoubleLine className="size-4 text-muted-foreground" /> },
        { label: "Remaining Amount", value: formatCurrency(obligations.reduce((s, o) => s + (o.remainingAmount ?? o.amount), 0)), icon: <RiTimeLine className="size-4 text-muted-foreground" /> },
      ]} />

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Procurement</TableHead>
              <TableHead>Budget Year</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  <RiBookmarkLine className="mx-auto size-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {statusFilter !== "all"
                      ? "No obligations match this filter."
                      : "No obligations found."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    {o.referenceNumber}
                  </TableCell>
                  <TableCell>{formatCurrency(o.amount)}</TableCell>
                  <TableCell className="capitalize">{o.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={o.status === "active" ? "default" : "secondary"}
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{o.procurementName || "—"}</TableCell>
                  <TableCell>
                    {o.budgetName ? (
                      <div className="text-sm">
                        <span className="font-medium">{o.budgetName}</span>
                        <span className="text-muted-foreground ml-1">
                          ({o.budgetYear || "—"})
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(o.paidAmount ?? 0)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(o.remainingAmount ?? o.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {o.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancel(o.id)}
                        title="Cancel"
                        className="text-destructive hover:text-destructive"
                      >
                        <RiCloseLine className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Obligation Modal */}
      {showCreate && (
        <CreateObligationModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
          procurements={procurements}
          budgetYears={budgetYears}
        />
      )}
    </div>
  );
}

function CreateObligationModal({
  onClose,
  onCreated,
  procurements,
  budgetYears,
}: {
  onClose: () => void;
  onCreated: () => void;
  procurements: Procurement[];
  budgetYears: BudgetYear[];
}) {
  const [form, setForm] = useState({
    referenceNumber: "",
    procurementId: "",
    budgetYearId: "",
    amount: "",
    type: "cash" as string,
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedYear = budgetYears.find((y) => y.id === form.budgetYearId);
  const remaining = selectedYear
    ? form.type === "cash"
      ? selectedYear.cash - selectedYear.consumedCash
      : selectedYear.credit - selectedYear.consumedCredit
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Obligation</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            const res = await createObligation({
              referenceNumber: form.referenceNumber,
              amount: parseFloat(form.amount),
              type: form.type as "cash" | "credit",
              procurementId: form.procurementId,
              budgetYearId: form.budgetYearId,
              note: form.note || null,
            });
            if (res?.data) {
              toast.success("Obligation created");
              onCreated();
            } else {
              toast.error(
                res?.serverError || "Failed to create obligation"
              );
            }
            setSubmitting(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Reference Number *</label>
            <Input
              placeholder="e.g. OBL-2026-001"
              value={form.referenceNumber}
              onChange={(e) =>
                setForm({ ...form, referenceNumber: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Procurement *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              value={form.procurementId}
              onChange={(e) =>
                setForm({ ...form, procurementId: e.target.value })
              }
              required
            >
              <option value="">Select procurement...</option>
              {procurements.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Budget Year *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              value={form.budgetYearId}
              onChange={(e) =>
                setForm({ ...form, budgetYearId: e.target.value })
              }
              required
            >
              <option value="">Select budget year...</option>
              {budgetYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.budgetName} - {y.year}
                </option>
              ))}
            </select>
            {remaining !== null && (
              <p className="text-xs text-muted-foreground">
                Remaining {form.type}: {formatCurrency(remaining)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
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
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Input
              placeholder="Optional note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
