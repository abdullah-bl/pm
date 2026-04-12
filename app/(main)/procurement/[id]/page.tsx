"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  getProcurement,
  listObligationsByProcurement,
  listAllPayments,
  checkProcurementAccess,
  createObligation,
  createPayment,
  listBudgetYears,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiCloseLine,
  RiBookmarkLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";

type Procurement = {
  id: string;
  referenceNumber: string;
  tenderNumber: string | null;
  name: string;
  status: string;
  type: string;
  vendorId: string | null;
  awardedAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: number;
  vendorName: string | null;
};

type Obligation = {
  id: string;
  referenceNumber: string;
  amount: number;
  type: string;
  status: string;
  note: string | null;
  createdAt: number;
  year: number;
  budgetName: string;
  economicCode: string;
};

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

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export default function UserProcurementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [procurement, setProcurement] = useState<Procurement | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessRole, setAccessRole] = useState<string | null>(null);
  const [showCreateObligation, setShowCreateObligation] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);

  const load = useCallback(async () => {
    // Get session for access check
    const sessionRes = await fetch("/api/auth/get-session");
    const session = await sessionRes.json();

    if (session?.user?.id) {
      const accessRes = await checkProcurementAccess({ userId: session.user.id });
      if (accessRes?.data) {
        setAccessRole(accessRes.data.role as string | null);
      }
    }

    const [procRes, oblRes, payRes] = await Promise.all([
      getProcurement({ id }),
      listObligationsByProcurement({ procurementId: id }),
      listAllPayments({}),
    ]);

    if (procRes?.data) {
      setProcurement(procRes.data as unknown as Procurement);
    }
    if (oblRes?.data) {
      setObligations(oblRes.data as unknown as Obligation[]);
    }
    if (payRes?.data) {
      // Filter payments for this procurement
      const allPayments = payRes.data as unknown as Payment[];
      setPayments(allPayments.filter((p) => p.procurementId === id));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-40 rounded-lg border bg-muted" />
        </div>
      </div>
    );
  }

  if (!procurement) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <RiArrowLeftLine className="size-4" /> Back
        </Button>
        <p className="text-muted-foreground">Procurement not found.</p>
      </div>
    );
  }

  const isWriter = accessRole === "write";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <RiArrowLeftLine className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{procurement.name}</h1>
          <p className="text-muted-foreground">{procurement.referenceNumber}</p>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[procurement.status] ?? "bg-gray-100 text-gray-700"}`}>
              {procurement.status.replace(/_/g, " ")}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{procurement.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vendor</p>
            <p className="font-medium">{procurement.vendorName || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Awarded Amount</p>
            <p className="font-medium">{procurement.awardedAmount != null ? formatCurrency(procurement.awardedAmount) : "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">{formatDate(procurement.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">{formatDate(procurement.endDate)}</p>
          </div>
          {procurement.tenderNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Tender Number</p>
              <p className="font-medium">{procurement.tenderNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Obligations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RiBookmarkLine className="size-5" />
            Obligations
          </h2>
          {isWriter && (
            <Button size="sm" className="gap-2" onClick={() => setShowCreateObligation(true)}>
              <RiAddLine className="size-4" />
              Create Obligation
            </Button>
          )}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    No obligations for this procurement.
                  </TableCell>
                </TableRow>
              ) : (
                obligations.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{o.referenceNumber}</TableCell>
                    <TableCell>{formatCurrency(o.amount)}</TableCell>
                    <TableCell className="capitalize">{o.type}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status] ?? ""}`}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.budgetName} ({o.year})
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Payments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RiMoneyDollarCircleLine className="size-5" />
            Payments
          </h2>
          {isWriter && (
            <Button size="sm" className="gap-2" onClick={() => setShowCreatePayment(true)}>
              <RiAddLine className="size-4" />
              Create Payment
            </Button>
          )}
        </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No payments for this procurement.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.referenceNumber}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] ?? ""}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(p.dueDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.paidDate)}</TableCell>
                    <TableCell className="font-mono text-sm">{p.obligationRef}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Obligation Modal */}
      {showCreateObligation && (
        <CreateObligationModal
          procurementId={id}
          onClose={() => setShowCreateObligation(false)}
          onCreated={() => {
            setShowCreateObligation(false);
            load();
          }}
        />
      )}

      {/* Create Payment Modal */}
      {showCreatePayment && (
        <CreatePaymentModal
          procurementId={id}
          onClose={() => setShowCreatePayment(false)}
          onCreated={() => {
            setShowCreatePayment(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateObligationModal({
  procurementId,
  onClose,
  onCreated,
}: {
  procurementId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    referenceNumber: "",
    budgetYearId: "",
    amount: "",
    type: "cash" as string,
    note: "",
  });
  const [budgetYears, setBudgetYears] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await listBudgetYears({});
      if (res?.data) {
        setBudgetYears(
          (res.data as unknown as any[]).filter((y) => y.status === "open")
        );
      }
      setLoadingData(false);
    }
    load();
  }, []);

  const selectedYear = budgetYears.find((y: any) => y.id === form.budgetYearId);
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
        {loadingData ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              const res = await createObligation({
                referenceNumber: form.referenceNumber,
                amount: parseFloat(form.amount),
                type: form.type as "cash" | "credit",
                procurementId,
                budgetYearId: form.budgetYearId,
                note: form.note || null,
              });
              if (res?.data) {
                toast.success("Obligation created");
                onCreated();
              } else {
                toast.error(res?.serverError || "Failed to create obligation");
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
                onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Budget Year *</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={form.budgetYearId}
                onChange={(e) => setForm({ ...form, budgetYearId: e.target.value })}
                required
              >
                <option value="">Select budget year...</option>
                {budgetYears.map((y: any) => (
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
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
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
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
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

function CreatePaymentModal({
  procurementId,
  onClose,
  onCreated,
}: {
  procurementId: string;
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
  const [obligations, setObligations] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await listObligationsByProcurement({ procurementId });
      if (res?.data) {
        setObligations(
          (res.data as unknown as any[]).filter((o) => o.status === "active")
        );
      }
      setLoadingData(false);
    }
    load();
  }, [procurementId]);

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
          <div className="py-8 text-center text-sm text-muted-foreground">Loading obligations...</div>
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
                onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Obligation *</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={form.obligationId}
                onChange={(e) => setForm({ ...form, obligationId: e.target.value })}
                required
              >
                <option value="">Select obligation...</option>
                {obligations.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.referenceNumber} — {formatCurrency(o.amount)}
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
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                placeholder="Optional note..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
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
