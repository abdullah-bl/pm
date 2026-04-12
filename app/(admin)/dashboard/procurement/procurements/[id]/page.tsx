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
  getProcurement,
  listVendors,
  listObligationsByProcurement,
  awardProcurement,
  advanceProcurementStatus,
  cancelProcurement,
  suspendProcurement,
  createObligation,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiCloseLine,
  RiArrowRightLine,
  RiCheckLine,
  RiForbidLine,
  RiStopCircleLine,
  RiAddLine,
  RiBookmarkLine,
  RiBankCardLine,
  RiHistoryLine,
} from "@remixicon/react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  offers_open: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  evaluation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  awarded: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  contract_active: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  suspended: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
};

const STATUS_FLOW = ["draft", "published", "offers_open", "evaluation", "awarded", "contract_active", "completed"];
const VALID_NEXT: Record<string, string[]> = {
  draft: ["published"],
  published: ["offers_open"],
  offers_open: ["evaluation"],
  evaluation: ["awarded"],
  awarded: ["contract_active"],
  contract_active: ["completed"],
  completed: [],
  cancelled: [],
  suspended: ["published", "offers_open", "evaluation", "awarded", "contract_active"],
};

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
  actualEndDate: string | null;
  cancelledAt: number | null;
  suspendedAt: number | null;
  cancellationReason: string | null;
  createdAt: number;
  updatedAt: number;
  vendorName: string | null;
};

type Vendor = { id: string; name: string };

type Obligation = {
  id: string;
  referenceNumber: string;
  amount: number;
  type: string;
  status: string;
  note: string | null;
  year: number;
  budgetName: string;
  economicCode: string;
  createdAt: number;
};

export default function ProcurementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [proc, setProc] = useState<Procurement | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "obligations" | "payments" | "log">("overview");

  // Award form
  const [showAward, setShowAward] = useState(false);
  const [awardVendorId, setAwardVendorId] = useState("");
  const [awardAmount, setAwardAmount] = useState("");

  // Cancel/Suspend
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  // Create obligation
  const [showCreateObligation, setShowCreateObligation] = useState(false);

  const load = useCallback(async () => {
    const [procRes, vendorsRes, oblRes] = await Promise.all([
      getProcurement({ id }),
      listVendors({}),
      listObligationsByProcurement({ procurementId: id }),
    ]);
    if (procRes?.data) setProc(procRes.data as unknown as Procurement);
    if (vendorsRes?.data) setVendors(vendorsRes.data as unknown as Vendor[]);
    if (oblRes?.data) setObligations(oblRes.data as unknown as Obligation[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAdvance = async (toStatus: string) => {
    const res = await advanceProcurementStatus({ id, toStatus: toStatus as any });
    if (res?.data) {
      toast.success(`Status advanced to ${toStatus.replace(/_/g, " ")}`);
      load();
    } else {
      toast.error(res?.serverError || "Failed to advance status");
    }
  };

  const handleAward = async () => {
    if (!awardVendorId || !awardAmount) return;
    const res = await awardProcurement({
      id,
      vendorId: awardVendorId,
      awardedAmount: parseFloat(awardAmount),
    });
    if (res?.data) {
      toast.success("Procurement awarded");
      setShowAward(false);
      load();
    } else {
      toast.error(res?.serverError || "Failed to award");
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    const res = await cancelProcurement({ id, reason: cancelReason });
    if (res?.data) {
      toast.success("Procurement cancelled");
      setShowCancel(false);
      load();
    } else {
      toast.error(res?.serverError || "Failed to cancel");
    }
  };

  const handleSuspend = async () => {
    const res = await suspendProcurement({ id, reason: suspendReason || null });
    if (res?.data) {
      toast.success("Procurement suspended");
      setShowSuspend(false);
      load();
    } else {
      toast.error(res?.serverError || "Failed to suspend");
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded-lg border bg-card" /></div>;
  }

  if (!proc) {
    return <div className="text-center text-muted-foreground py-12">Procurement not found.</div>;
  }

  const isTerminal = proc.status === "completed" || proc.status === "cancelled";
  const nextStatuses = VALID_NEXT[proc.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/procurement/procurements")}>
          <RiArrowLeftLine className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{proc.name}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[proc.status] ?? ""}`}>
              {proc.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {proc.referenceNumber} {proc.tenderNumber ? `· Tender: ${proc.tenderNumber}` : ""} · {proc.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isTerminal && proc.status !== "suspended" && (
            <>
              <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setShowCancel(true)}>
                <RiStopCircleLine className="size-3.5" /> Cancel
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowSuspend(true)}>
                <RiForbidLine className="size-3.5" /> Suspend
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Flow */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Status Flow</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const currentIndex = STATUS_FLOW.indexOf(proc.status);
            const isActive = s === proc.status;
            const isPast = currentIndex > i;
            const isNext = nextStatuses.includes(s);
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? statusColors[s]
                      : isPast
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPast && <RiCheckLine className="size-3" />}
                  {s.replace(/_/g, " ")}
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <RiArrowRightLine className="size-3 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        {nextStatuses.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                onClick={() => handleAdvance(s)}
                className="gap-1"
              >
                Advance to {s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["overview", "obligations", "payments", "log"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <span className="text-xs text-muted-foreground">Reference</span>
                <p className="text-sm font-medium font-mono">{proc.referenceNumber}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tender Number</span>
                <p className="text-sm font-medium">{proc.tenderNumber || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Type</span>
                <p className="text-sm font-medium capitalize">{proc.type}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Vendor</span>
                <p className="text-sm font-medium">{proc.vendorName || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Awarded Amount</span>
                <p className="text-sm font-medium">{formatCurrency(proc.awardedAmount)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm font-medium">{formatDateTime(proc.createdAt)}</p>
              </div>
              {proc.startDate && (
                <div>
                  <span className="text-xs text-muted-foreground">Start Date</span>
                  <p className="text-sm font-medium">{proc.startDate}</p>
                </div>
              )}
              {proc.endDate && (
                <div>
                  <span className="text-xs text-muted-foreground">End Date</span>
                  <p className="text-sm font-medium">{proc.endDate}</p>
                </div>
              )}
              {proc.cancellationReason && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <span className="text-xs text-muted-foreground">Cancellation Reason</span>
                  <p className="text-sm font-medium text-red-500">{proc.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Award Section */}
          {proc.status === "evaluation" && !proc.vendorId && (
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20 p-6">
              <h3 className="text-lg font-semibold mb-3">Award Procurement</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set the vendor and awarded amount before advancing to &quot;awarded&quot; status.
              </p>
              {!showAward ? (
                <Button onClick={() => setShowAward(true)} className="gap-2">
                  Set Vendor &amp; Amount
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vendor *</label>
                    <select
                      className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={awardVendorId}
                      onChange={(e) => setAwardVendorId(e.target.value)}
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Awarded Amount *</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={awardAmount}
                      onChange={(e) => setAwardAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAward(false)}>Cancel</Button>
                    <Button onClick={handleAward} disabled={!awardVendorId || !awardAmount}>
                      Award
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "obligations" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <RiBookmarkLine className="size-5" />
              Obligations ({obligations.length})
            </h3>
            {proc.status === "contract_active" && (
              <Button size="sm" className="gap-1" onClick={() => setShowCreateObligation(true)}>
                <RiAddLine className="size-3.5" /> Create Obligation
              </Button>
            )}
          </div>
          {obligations.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              <p className="text-sm">No obligations for this procurement.</p>
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
                    <TableHead>Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/procurement/obligations/${o.id}`)}>
                      <TableCell className="font-mono text-sm">{o.referenceNumber}</TableCell>
                      <TableCell>{formatCurrency(o.amount)}</TableCell>
                      <TableCell className="capitalize">{o.type}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "active" ? "default" : "secondary"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{o.budgetName} ({o.year})</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === "payments" && (
        <PaymentList obligations={obligations} />
      )}

      {activeTab === "log" && (
        <StatusLog procurementId={id} />
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCancel(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cancel Procurement</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCancel(false)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will cancel the procurement <strong>{proc.name}</strong>. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason *</label>
                <Input
                  placeholder="Reason for cancellation"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCancel(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>
                  Confirm Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSuspend(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Suspend Procurement</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSuspend(false)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  placeholder="Reason for suspension"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSuspend(false)}>Cancel</Button>
                <Button onClick={handleSuspend}>Suspend</Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}

function PaymentList({ obligations }: { obligations: Obligation[] }) {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    async function loadPayments() {
      const { listPaymentsByObligation } = await import("@/lib/actions/procurement");
      const allPayments: any[] = [];
      for (const obl of obligations) {
        const res = await listPaymentsByObligation({ obligationId: obl.id });
        if (res?.data) {
          allPayments.push(...(res.data as any[]).map((p: any) => ({ ...p, obligationRef: obl.referenceNumber })));
        }
      }
      setPayments(allPayments);
    }
    if (obligations.length > 0) loadPayments();
  }, [obligations]);

  const paymentStatusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <RiBankCardLine className="size-5" />
        Payments ({payments.length})
      </h3>
      {payments.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p className="text-sm">No payments for this procurement.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Obligation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.referenceNumber}</TableCell>
                  <TableCell>{formatCurrency(p.amount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusColors[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell>{p.dueDate || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{p.obligationRef}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatusLog({ procurementId }: { procurementId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      const { db } = await import("@/lib/db");
      const { procurementStatusLog } = await import("@/lib/db/schema");
      const { eq, desc } = await import("drizzle-orm");
      const result = await db.select().from(procurementStatusLog)
        .where(eq(procurementStatusLog.procurementId, procurementId))
        .orderBy(desc(procurementStatusLog.changedAt));
      setLogs(result);
      setLoading(false);
    }
    loadLogs();
  }, [procurementId]);

  if (loading) return <div className="animate-pulse h-20 rounded bg-muted" />;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <RiHistoryLine className="size-5" />
        Status History ({logs.length})
      </h3>
      {logs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p className="text-sm">No status changes recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-col items-center">
                <div className="size-3 rounded-full bg-primary" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {log.fromStatus && (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[log.fromStatus] ?? ""}`}>
                      {log.fromStatus.replace(/_/g, " ")}
                    </span>
                  )}
                  <RiArrowRightLine className="size-3 text-muted-foreground" />
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[log.toStatus] ?? ""}`}>
                    {log.toStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{formatDateTime(log.changedAt)}</span>
                  {log.reason && <span>· {log.reason}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
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
    amount: "",
    type: "cash" as string,
    budgetYearId: "",
    note: "",
  });
  const [budgetYears, setBudgetYears] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBudgetYears() {
      const { db } = await import("@/lib/db");
      const { budgetYear, budget } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      const result = await db.select({
        id: budgetYear.id,
        year: budgetYear.year,
        cash: budgetYear.cash,
        credit: budgetYear.credit,
        consumedCash: budgetYear.consumedCash,
        consumedCredit: budgetYear.consumedCredit,
        status: budgetYear.status,
        budgetName: budget.name,
      }).from(budgetYear).innerJoin(budget, eq(budgetYear.budgetId, budget.id))
        .where(eq(budgetYear.status, "open"));
      setBudgetYears(result);
    }
    loadBudgetYears();
  }, []);

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
          <h2 className="text-lg font-semibold">Create Obligation</h2>
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
      </div>
    </div>
  );
}
