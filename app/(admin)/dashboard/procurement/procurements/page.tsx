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
  createProcurement,
  listProcurements,
} from "@/lib/actions/procurement";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiAddLine,
  RiSearchLine,
  RiCloseLine,
  RiArrowRightLine,
  RiFileList3Line,
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

const ALL_STATUSES = ["draft", "published", "offers_open", "evaluation", "awarded", "contract_active", "completed", "cancelled", "suspended"];
const ALL_TYPES = ["goods", "services", "works"];

type Procurement = {
  id: string;
  referenceNumber: string;
  tenderNumber: string | null;
  name: string;
  status: string;
  type: string;
  vendorId: string | null;
  awardedAmount: number | null;
  vendorName: string | null;
  createdAt: number;
};

export default function ProcurementsPage() {
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const res = await listProcurements({});
    if (res?.data) setProcurements(res.data as unknown as Procurement[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = (s: string) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const filtered = procurements.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter.length === 0 || statusFilter.includes(p.status);
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procurements</h1>
          <p className="text-muted-foreground">Manage procurement processes.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine className="size-4" />
          New Procurement
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${
                statusColors[s] ?? ""
              } ${statusFilter.length > 0 && !statusFilter.includes(s) ? "opacity-30" : ""}`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
          {statusFilter.length > 0 && (
            <button
              onClick={() => setStatusFilter([])}
              className="text-xs text-muted-foreground underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <RiFileList3Line className="mx-auto size-8 mb-2 opacity-50" />
                  <p className="text-sm">{search || statusFilter.length > 0 ? "No procurements match your filters." : "No procurements yet."}</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {}}
                >
                  <TableCell className="font-mono text-sm">{p.referenceNumber}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/procurement/procurements/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{p.type}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] ?? ""}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>{p.vendorName || "—"}</TableCell>
                  <TableCell>{formatCurrency(p.awardedAmount)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/procurement/procurements/${p.id}`}>
                      <Button variant="ghost" size="icon" title="View">
                        <RiArrowRightLine className="size-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Procurement Modal */}
      {showCreate && (
        <CreateProcurementModal
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

function CreateProcurementModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    referenceNumber: "",
    tenderNumber: "",
    type: "goods" as string,
  });
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Procurement</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.name.trim() || !form.referenceNumber.trim()) return;
            setSubmitting(true);
            const res = await createProcurement({
              name: form.name,
              referenceNumber: form.referenceNumber,
              tenderNumber: form.tenderNumber || null,
              type: form.type as "goods" | "services" | "works",
            });
            if (res?.data) {
              toast.success("Procurement created");
              onCreated();
            } else {
              toast.error(res?.serverError || "Failed to create procurement");
            }
            setSubmitting(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              placeholder="Procurement name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reference Number *</label>
            <Input
              placeholder="e.g. PROC-2026-001"
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tender Number</label>
            <Input
              placeholder="Optional tender number"
              value={form.tenderNumber}
              onChange={(e) => setForm({ ...form, tenderNumber: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type *</label>
            <select
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="goods">Goods</option>
              <option value="services">Services</option>
              <option value="works">Works</option>
            </select>
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
