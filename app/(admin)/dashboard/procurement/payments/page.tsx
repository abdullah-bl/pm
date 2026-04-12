"use client";

import { useEffect, useState, useCallback } from "react";
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
  createPayment,
  approvePayment,
  markPaymentPaid,
  rejectPayment,
  listAllPayments,
  listAllObligations,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiAddLine,
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiMoneyDollarCircleLine,
  RiBankLine,
} from "@remixicon/react";

type Payment = {
  id: string;
  referenceNumber: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  paymentMethod: string | null;
  note: string | null;
  createdAt: number;
  obligationId: string;
  obligationRef: string;
  procurementId: string;
  procurementName: string;
};

type Obligation = {
  id: string;
  referenceNumber: string;
  amount: number;
  type: string;
  status: string;
  procurementName: string;
  paidAmount: number;
  remainingAmount: number;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const ALL_STATUSES = ["pending", "approved", "paid", "rejected"];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<Payment | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    const res = await listAllPayments({});
    if (res?.data) setPayments(res.data as unknown as Payment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOverdue = (p: Payment) =>
    p.dueDate &&
    p.dueDate < today &&
    (p.status === "pending" || p.status === "approved");

  const filtered = payments.filter((p) => {
    const matchSearch =
      !search ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.procurementName.toLowerCase().includes(search.toLowerCase()) ||
      p.obligationRef.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchOverdue = !showOverdueOnly || isOverdue(p);
    return matchSearch && matchStatus && matchOverdue;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage payment schedules and approvals.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine className="size-4" />
          New Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ref, procurement, obligation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showOverdueOnly}
            onChange={(e) => setShowOverdueOnly(e.target.checked)}
            className="rounded"
          />
          Overdue only
        </label>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid Date</TableHead>
              <TableHead>Obligation</TableHead>
              <TableHead>Procurement</TableHead>
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
                  <RiMoneyDollarCircleLine className="mx-auto size-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {search || statusFilter !== "all" || showOverdueOnly
                      ? "No payments match your filters."
                      : "No payments yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className={`hover:bg-muted/50 ${
                    isOverdue(p) ? "bg-red-50 dark:bg-red-950/20" : ""
                  }`}
                >
                  <TableCell className="font-mono text-sm">
                    {p.referenceNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[p.status] ?? ""
                      }`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(p.dueDate)}
                    {isOverdue(p) && (
                      <span className="ml-1 text-xs text-red-600 font-medium">
                        overdue
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(p.paidDate)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {p.obligationRef}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.procurementName}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Approve"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={async () => {
                              const res = await approvePayment({ id: p.id });
                              if (res?.data) {
                                toast.success("Payment approved");
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
                              const res = await rejectPayment({ id: p.id });
                              if (res?.data) {
                                toast.success("Payment rejected");
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
                        </>
                      )}
                      {p.status === "approved" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark Paid"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => setMarkPaidTarget(p)}
                          >
                            <RiBankLine className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reject"
                            className="text-red-600 hover:text-red-700"
                            onClick={async () => {
                              const res = await rejectPayment({ id: p.id });
                              if (res?.data) {
                                toast.success("Payment rejected");
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
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Payment Modal */}
      {showCreate && (
        <CreatePaymentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {/* Mark Paid Modal */}
      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMarkPaidTarget(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mark Payment as Paid</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMarkPaidTarget(null)}
              >
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Payment <strong>{markPaidTarget.referenceNumber}</strong> —{" "}
                {formatCurrency(markPaidTarget.amount)}
              </p>
            </div>
            <MarkPaidForm
              onSubmit={async (paymentMethod) => {
                const res = await markPaymentPaid({
                  id: markPaidTarget.id,
                  paymentMethod: paymentMethod || null,
                });
                if (res?.data) {
                  toast.success("Payment marked as paid");
                  setMarkPaidTarget(null);
                  load();
                } else {
                  toast.error(res?.serverError || "Failed to mark as paid");
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePaymentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    referenceNumber: "",
    amount: "",
    dueDate: "",
    obligationId: "",
    note: "",
  });
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await listAllObligations({});
      if (res?.data) {
        // Only show active obligations
        setObligations(
          (res.data as unknown as Obligation[]).filter((o) => o.status === "active")
        );
      }
      setLoadingData(false);
    }
    load();
  }, []);

  const selectedObligation = obligations.find(
    (o) => o.id === form.obligationId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Payment</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        {loadingData ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading obligations...
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!form.obligationId) return;
              setSubmitting(true);
              const res = await createPayment({
                referenceNumber: form.referenceNumber,
                amount: parseFloat(form.amount),
                dueDate: form.dueDate || null,
                obligationId: form.obligationId,
                note: form.note || null,
              });
              if (res?.data) {
                toast.success("Payment created");
                onCreated();
              } else {
                toast.error(res?.serverError || "Failed to create payment");
              }
              setSubmitting(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Number *</label>
              <Input
                placeholder="e.g. PAY-2026-001"
                value={form.referenceNumber}
                onChange={(e) =>
                  setForm({ ...form, referenceNumber: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Obligation *</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={form.obligationId}
                onChange={(e) =>
                  setForm({ ...form, obligationId: e.target.value })
                }
                required
              >
                <option value="">Select obligation...</option>
                {obligations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.referenceNumber} — {o.procurementName} (Remaining:{" "}
                    {formatCurrency(o.remainingAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedObligation?.remainingAmount ?? undefined}
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
              {selectedObligation && (
                <p className="text-xs text-muted-foreground">
                  Obligation remaining:{" "}
                  {formatCurrency(selectedObligation.remainingAmount)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                placeholder="Optional note..."
                value={form.note}
                onChange={(e) =>
                  setForm({ ...form, note: e.target.value })
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

function MarkPaidForm({
  onSubmit,
}: {
  onSubmit: (paymentMethod: string) => Promise<void>;
}) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(paymentMethod);
        setSubmitting(false);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Method</label>
        <Input
          placeholder="e.g. Bank transfer, Check, Wire"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => onSubmit("")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Mark Paid"}
        </Button>
      </div>
    </form>
  );
}
