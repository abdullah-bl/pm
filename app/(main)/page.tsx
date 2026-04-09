"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getMyCollections, createCollection } from "@/lib/actions/collections";
import { toast } from "sonner";
import {
  RiAddLine,
  RiFolderLine,
  RiCloseLine,
  RiUserLine,
  RiGroupLine,
  RiShareLine,
} from "@remixicon/react";

type Collection = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  role: string;
  taskCount: number;
};

export default function UserDashboard() {
  const [owned, setOwned] = useState<Collection[]>([]);
  const [shared, setShared] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    const res = await getMyCollections({});
    if (res?.data) {
      setOwned((res.data as any).owned || []);
      setShared((res.data as any).shared || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const res = await createCollection({ name: form.name, description: form.description || undefined });
    if (res?.data) {
      toast.success("Collection created");
      setShowModal(false);
      setForm({ name: "", description: "" });
      load();
    } else {
      toast.error("Failed to create collection");
    }
  };

  const renderCollectionCard = (col: Collection) => (
    <div key={col.id} className="rounded-lg border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href={`/collections/${col.id}`} className="font-semibold hover:underline truncate block">
            {col.name}
          </Link>
          {col.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{col.description}</p>
          )}
        </div>
        <Badge variant={col.status === "active" ? "default" : "secondary"}>
          {col.role}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{col.taskCount} task{col.taskCount !== 1 ? "s" : ""}</span>
        <span>{new Date(col.createdAt).toLocaleDateString()}</span>
      </div>
      <Link href={`/collections/${col.id}`}>
        <Button variant="outline" size="sm" className="w-full">
          Open
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Collections</h1>
          <p className="text-muted-foreground">Your collections and shared projects.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}>
          <RiAddLine className="size-4" />
          New Collection
        </Button>
      </div>

      {/* Owned */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RiFolderLine className="size-5" />
          Created by me
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg border bg-card animate-pulse" />
            ))}
          </div>
        ) : owned.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <RiFolderLine className="mx-auto size-8 mb-2 opacity-50" />
            <p className="text-sm">No collections yet. Create one above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map(renderCollectionCard)}
          </div>
        )}
      </div>

      {/* Shared */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RiShareLine className="size-5" />
          Shared with me
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-lg border bg-card animate-pulse" />
            ))}
          </div>
        ) : shared.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            <RiGroupLine className="mx-auto size-8 mb-2 opacity-50" />
            <p className="text-sm">No shared collections yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map(renderCollectionCard)}
          </div>
        )}
      </div>

      {/* New Collection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Collection</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Collection name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
