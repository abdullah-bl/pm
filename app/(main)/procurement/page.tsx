"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  listProcurements,
  checkProcurementAccess,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  RiSearchLine,
  RiFileList3Line,
  RiLockLine,
} from "@remixicon/react";

type Procurement = {
  id: string;
  referenceNumber: string;
  name: string;
  status: string;
  type: string;
  vendorId: string | null;
  awardedAmount: number | null;
  createdAt: number;
  vendorName: string | null;
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  offers_open: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  evaluation: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  awarded: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  contract_active: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  suspended: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
};

export default function UserProcurementPage() {
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessRole, setAccessRole] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const ALL_STATUSES = [
    "draft", "published", "offers_open", "evaluation",
    "awarded", "contract_active", "completed", "cancelled", "suspended",
  ];

  const load = useCallback(async () => {
    // Check access
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

    // Load procurements
    const res = await listProcurements({});
    if (res?.data) {
      setProcurements(res.data as unknown as Procurement[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = procurements.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.vendorName?.toLowerCase() ?? "").includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground">View procurement data.</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground">
            View procurement data{accessRole === "write" ? " (write access)" : " (read-only)"}.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, ref, vendor..."
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
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Awarded Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <RiFileList3Line className="mx-auto size-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {search || statusFilter !== "all"
                      ? "No procurements match your filters."
                      : "No procurements yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    <Link href={`/procurement/${p.id}`} className="hover:underline text-primary">
                      {p.referenceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="capitalize">{p.type}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusColors[p.status] ?? ""
                      }`}
                    >
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{p.vendorName || "—"}</TableCell>
                  <TableCell className="font-medium">
                    {p.awardedAmount != null ? formatCurrency(p.awardedAmount) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
