"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { listProjects, newProject, editProject, removeProject } from "@/lib/actions/tasks";
import { toast } from "sonner";
import {
  RiAddLine,
  RiFolderLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiArchiveLine,
  RiCheckLine,
  RiSearchLine,
  RiArrowRightLine,
} from "@remixicon/react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  taskCount: number;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const load = async () => {
    const res = await listProjects({});
    if (res?.data) setProjects((res.data as any).projects ?? res.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const res = await newProject({ name: form.name, description: form.description || undefined });
    if (res?.data) {
      toast.success("Collection created");
      setShowModal(false);
      setForm({ name: "", description: "" });
      load();
    } else {
      toast.error("Failed to create collection");
    }
  };

  const handleToggleStatus = async (p: Project) => {
    const newStatus = p.status === "active" ? "archived" : "active";
    const res = await editProject({ id: p.id, status: newStatus as "active" | "archived" });
    if (res?.data) {
      toast.success(`Project ${newStatus}`);
      load();
    } else {
      toast.error("Failed to update collection");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await removeProject({ id });
    if (res?.data) {
      toast.success("Collection deleted");
      setDeleteTarget(null);
      load();
    } else {
      toast.error("Failed to delete collection");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your collections and tasks.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}>
          <RiAddLine className="size-4" />
          New Collection
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search collections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <RiFolderLine className="mx-auto size-8 mb-2 opacity-50" />
          <p className="text-sm">{search ? "No collections match your search." : "No collections yet. Create one above."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/collections/${p.id}`} className="font-semibold hover:underline truncate block">
                    {p.name}
                  </Link>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <Badge variant={p.status === "active" ? "default" : "secondary"}>
                  {p.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{p.taskCount} task{p.taskCount !== 1 ? "s" : ""}</span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link href={`/admin/collections/${p.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    View <RiArrowRightLine className="size-3" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleToggleStatus(p)}
                >
                  {p.status === "active" ? <RiArchiveLine className="size-3" /> : <RiCheckLine className="size-3" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(p)}
                >
                  <RiDeleteBinLine className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delete Collection</h2>
              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(null)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? All tasks and comments will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteTarget.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
