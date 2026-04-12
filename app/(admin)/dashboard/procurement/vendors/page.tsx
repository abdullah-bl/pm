"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  createVendor,
  updateVendor,
  deleteVendor,
  listVendors,
} from "@/lib/actions/procurement";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RiAddLine,
  RiSearchLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiArrowRightLine,
  RiStore2Line,
} from "@remixicon/react";

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

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  const load = useCallback(async () => {
    const res = await listVendors({});
    if (res?.data) setVendors(res.data as unknown as Vendor[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = Array.from(new Set(vendors.map((v) => v.category).filter(Boolean) as string[]));

  const filtered = vendors.filter((v) => {
    const matchSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (v.category?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Manage vendor accounts.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine className="size-4" />
          Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>License</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <RiStore2Line className="mx-auto size-8 mb-2 opacity-50" />
                  <p className="text-sm">{search ? "No vendors match your search." : "No vendors yet."}</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/procurement/vendors/${v.id}`} className="hover:underline">
                      {v.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {v.category ? <Badge variant="secondary">{v.category}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{v.email || "—"}</TableCell>
                  <TableCell>{v.phone || "—"}</TableCell>
                  <TableCell>{v.licenseNumber || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditTarget(v)} title="Edit">
                        <RiEditLine className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(v)} title="Delete" className="text-destructive hover:text-destructive">
                        <RiDeleteBinLine className="size-4" />
                      </Button>
                      <Link href={`/dashboard/procurement/vendors/${v.id}`}>
                        <Button variant="ghost" size="icon" title="View">
                          <RiArrowRightLine className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Vendor Modal */}
      {showCreate && (
        <VendorModal
          title="Add Vendor"
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            const res = await createVendor(data);
            if (res?.data) {
              toast.success("Vendor created");
              setShowCreate(false);
              load();
            } else {
              toast.error(res?.serverError || "Failed to create vendor");
            }
          }}
        />
      )}

      {/* Edit Vendor Modal */}
      {editTarget && (
        <VendorModal
          title="Edit Vendor"
          onClose={() => setEditTarget(null)}
          initial={{
            name: editTarget.name,
            email: editTarget.email ?? "",
            phone: editTarget.phone ?? "",
            address: editTarget.address ?? "",
            category: editTarget.category ?? "",
            licenseNumber: editTarget.licenseNumber ?? "",
          }}
          onSubmit={async (data) => {
            const res = await updateVendor({ id: editTarget.id, ...data });
            if (res?.data) {
              toast.success("Vendor updated");
              setEditTarget(null);
              load();
            } else {
              toast.error(res?.serverError || "Failed to update vendor");
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delete Vendor</h2>
              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(null)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              Vendors with linked procurements cannot be deleted.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const res = await deleteVendor({ id: deleteTarget.id });
                  if (res?.data) {
                    toast.success("Vendor deleted");
                    setDeleteTarget(null);
                    load();
                  } else {
                    toast.error(res?.serverError || "Cannot delete vendor with linked procurements");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorModal({
  title,
  onClose,
  initial,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  initial?: { name: string; email: string; phone: string; address: string; category: string; licenseNumber: string };
  onSubmit: (data: { name: string; email: string | null; phone: string | null; address: string | null; category: string | null; licenseNumber: string | null }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    category: initial?.category ?? "",
    licenseNumber: initial?.licenseNumber ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            await onSubmit({
              name: form.name,
              email: form.email || null,
              phone: form.phone || null,
              address: form.address || null,
              category: form.category || null,
              licenseNumber: form.licenseNumber || null,
            });
            setSubmitting(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              placeholder="Vendor name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="vendor@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              placeholder="+966 ..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              placeholder="Street address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                placeholder="e.g. IT, Construction"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">License #</label>
              <Input
                placeholder="License number"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
