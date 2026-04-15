"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getProcurement,
  restoreProcurement,
  getAuditLogs,
  checkProcurementAccess,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiHistoryLine,
  RiArrowGoBackLine,
  RiEditLine,
  RiDeleteBinLine,
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
  deletedAt: number | null;
  deletedBy: string | null;
  createdAt: number;
  vendorName: string | null;
};

type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: number;
  ipAddress: string | null;
  changes: any;
  reason: string | null;
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-blue-100 text-blue-700",
  offers_open: "bg-cyan-100 text-cyan-700",
  evaluation: "bg-yellow-100 text-yellow-700",
  awarded: "bg-orange-100 text-orange-700",
  contract_active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  suspended: "bg-pink-100 text-pink-700",
};

export default function UserProcurementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isDeletedView = searchParams.get("deleted") === "true";

  const [procurement, setProcurement] = useState<Procurement | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessRole, setAccessRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Get session to pass correct userId
    const sessionRes = await fetch("/api/auth/get-session");
    const session = await sessionRes.json();
    const userId = session?.user?.id || "";

    const [procRes, accessRes, logsRes] = await Promise.all([
      getProcurement({ id }),
      userId ? checkProcurementAccess({ userId }) : Promise.resolve(null),
      getAuditLogs({ entityId: id, entityType: "procurement" }),
    ]);

    if (procRes?.data) {
      setProcurement(procRes.data as unknown as Procurement);
    }
    if (accessRes?.data) {
      setAccessRole(accessRes.data.role as string | null);
    }
    if (logsRes?.data) {
      setAuditLogs(logsRes.data as unknown as AuditLogEntry[]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async () => {
    if (!confirm("Are you sure you want to restore this procurement? This action will be logged.")) {
      return;
    }

    const res = await restoreProcurement({
      id,
      reason: "Restored by user",
    });

    if (res?.data) {
      toast.success("Procurement restored successfully");
      router.push(`/procurement/${id}`);
    } else {
      toast.error(res?.serverError || "Failed to restore procurement");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <RiArrowLeftLine className="size-4" />
          </Button>
          <div className="flex-1">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!procurement) {
    return (
      <div className="space-y-6">
        <Link href="/procurement">
          <Button variant="ghost" size="icon">
            <RiArrowLeftLine className="size-4" />
          </Button>
        </Link>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold mb-2">Procurement Not Found</h2>
          <p className="text-muted-foreground">The requested procurement could not be found.</p>
        </div>
      </div>
    );
  }

  const canWrite = accessRole === "write";
  const isDeleted = procurement.deletedAt !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/procurement">
            <Button variant="ghost" size="icon">
              <RiArrowLeftLine className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{procurement.name}</h1>
            <p className="text-muted-foreground">{procurement.referenceNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDeleted && canWrite && (
            <Button onClick={handleRestore} className="gap-2">
              <RiArrowGoBackLine className="size-4" />
              Restore
            </Button>
          )}
          {!isDeleted && canWrite && (
            <>
              <Button variant="outline" className="gap-2">
                <RiEditLine className="size-4" />
                Edit
              </Button>
              <Button variant="destructive" className="gap-2">
                <RiDeleteBinLine className="size-4" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {isDeleted && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <div className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
            <RiDeleteBinLine className="size-5" />
            <div>
              <p className="font-semibold">Archived Procurement</p>
              <p className="text-sm opacity-90">
                This procurement was archived on{" "}
                {formatDate(new Date(procurement.deletedAt!))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{procurement.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={statusColors[procurement.status] ?? ""}>
                {procurement.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tender Number</span>
              <span className="font-medium">{procurement.tenderNumber || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Vendor</span>
              <span className="font-medium">{procurement.vendorName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Awarded Amount</span>
              <span className="font-medium">
                {formatCurrency(procurement.awardedAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Start Date</span>
              <span className="font-medium">
                {procurement.startDate ? formatDate(new Date(procurement.startDate)) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">End Date</span>
              <span className="font-medium">
                {procurement.endDate ? formatDate(new Date(procurement.endDate)) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="font-medium">
                {formatDate(new Date(procurement.createdAt))}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RiHistoryLine className="size-4" />
              Audit Log
            </h2>
            <Badge variant="outline">{auditLogs.length} entries</Badge>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No audit logs yet.
              </p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="text-sm border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{log.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(log.timestamp))}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    By {log.userName} ({log.userRole})
                  </div>
                  {log.changes && (
                    <div className="text-xs bg-muted p-2 rounded font-mono">
                      {JSON.stringify(log.changes, null, 2)}
                    </div>
                  )}
                  {log.reason && (
                    <div className="text-xs text-muted-foreground italic mt-1">
                      Reason: {log.reason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
