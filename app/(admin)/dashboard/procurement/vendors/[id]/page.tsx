"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  getVendor,
  listProcurements,
} from "@/lib/actions/procurement";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  RiArrowLeftLine,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiShieldLine,
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

type Vendor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  licenseNumber: string | null;
  createdAt: number;
};

type Procurement = {
  id: string;
  referenceNumber: string;
  name: string;
  status: string;
  type: string;
  awardedAmount: number | null;
};

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [procurements, setProcurements] = useState<Procurement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [vendorRes, procRes] = await Promise.all([
      getVendor({ id: vendorId }),
      listProcurements({}),
    ]);
    if (vendorRes?.data) setVendor(vendorRes.data as unknown as Vendor);
    if (procRes?.data) {
      const procs = (procRes.data as any).procurements ?? procRes.data;
      const linked = Array.isArray(procs) ? procs.filter((p: any) => p.vendorId === vendorId) : [];
      setProcurements(linked);
    }
    setLoading(false);
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-40 animate-pulse rounded-lg border bg-card" /></div>;
  }

  if (!vendor) {
    return <div className="text-center text-muted-foreground py-12">Vendor not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/procurement/vendors")}>
          <RiArrowLeftLine className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{vendor.name}</h1>
          {vendor.category && <Badge variant="secondary" className="mt-1">{vendor.category}</Badge>}
        </div>
      </div>

      {/* Vendor Info */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Vendor Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendor.email && (
            <div className="flex items-center gap-2 text-sm">
              <RiMailLine className="size-4 text-muted-foreground" />
              <span>{vendor.email}</span>
            </div>
          )}
          {vendor.phone && (
            <div className="flex items-center gap-2 text-sm">
              <RiPhoneLine className="size-4 text-muted-foreground" />
              <span>{vendor.phone}</span>
            </div>
          )}
          {vendor.address && (
            <div className="flex items-center gap-2 text-sm">
              <RiMapPinLine className="size-4 text-muted-foreground" />
              <span>{vendor.address}</span>
            </div>
          )}
          {vendor.licenseNumber && (
            <div className="flex items-center gap-2 text-sm">
              <RiShieldLine className="size-4 text-muted-foreground" />
              <span>License: {vendor.licenseNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Added {formatDate(vendor.createdAt)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Linked Procurements */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RiFileList3Line className="size-5" />
          Linked Procurements ({procurements.length})
        </h2>
        {procurements.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <p className="text-sm">No procurements linked to this vendor.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Awarded Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procurements.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/procurement/procurements/${p.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{p.referenceNumber}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="capitalize">{p.type}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] ?? ""}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(p.awardedAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
