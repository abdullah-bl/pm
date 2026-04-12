"use client";

import { useEffect, useState, useCallback } from "react";
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
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  banUser,
  unbanUser,
} from "@/lib/actions/users";
import { toast } from "sonner";
import {
  RiAddLine,
  RiSearchLine,
  RiEditLine,
  RiDeleteBinLine,
  RiForbidLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react";

type User = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: Date | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await listUsers({ page, limit: 10, search: search || undefined, role: roleFilter });
    if (res?.data) {
      setUsers(res.data.users as User[]);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <RiAddLine className="size-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.username || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditUser(u)}
                        title="Edit"
                      >
                        <RiEditLine className="size-4" />
                      </Button>
                      {u.banned ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await unbanUser({ id: u.id });
                            toast.success("User unbanned");
                            loadUsers();
                          }}
                          title="Unban"
                        >
                          <RiCheckLine className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setBanTarget(u)}
                          title="Ban"
                        >
                          <RiForbidLine className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(u)}
                        title="Delete"
                      >
                        <RiDeleteBinLine className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} user{total !== 1 ? "s" : ""} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Create User" onClose={() => setShowCreate(false)}>
          <UserForm
            onSubmit={async (data) => {
              const res = await createUser(data);
              if (res?.data?.success) {
                toast.success("User created");
                setShowCreate(false);
                loadUsers();
              } else {
                toast.error(res?.data?.error || res?.serverError || "Failed to create user");
              }
            }}
            submitLabel="Create"
          />
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <UserForm
            initial={{
              name: editUser.name,
              email: editUser.email,
              username: editUser.username || "",
              role: (editUser.role as "admin" | "user") || "user",
            }}
            onSubmit={async (data) => {
              const res = await updateUser({ id: editUser.id, ...data });
              if (res?.data?.success) {
                toast.success("User updated");
                setEditUser(null);
                loadUsers();
              } else {
                toast.error("Failed to update user");
              }
            }}
            submitLabel="Save"
            noPassword
          />
        </Modal>
      )}

      {/* Ban User Modal */}
      {banTarget && (
        <Modal title="Ban User" onClose={() => setBanTarget(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const res = await banUser({
                id: banTarget.id,
                reason: (fd.get("reason") as string) || undefined,
              });
              if (res?.data?.success) {
                toast.success("User banned");
                setBanTarget(null);
                loadUsers();
              } else {
                toast.error("Failed to ban user");
              }
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Ban <strong>{banTarget.name}</strong> ({banTarget.email})?
            </p>
            <Field>
              <FieldLabel>Reason (optional)</FieldLabel>
              <Textarea name="reason" placeholder="Reason for ban..." />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setBanTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" type="submit">
                Ban User
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const res = await deleteUser({ id: deleteTarget.id });
                  if (res?.data?.success) {
                    toast.success("User deleted");
                    setDeleteTarget(null);
                    loadUsers();
                  } else {
                    toast.error("Failed to delete user");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
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
        {children}
      </div>
    </div>
  );
}

function UserForm({
  initial,
  onSubmit,
  submitLabel,
  noPassword,
}: {
  initial?: { name: string; email: string; username: string; role: "admin" | "user" };
  onSubmit: (data: { name: string; email: string; username: string; password: string; role: "admin" | "user" }) => Promise<void>;
  submitLabel: string;
  noPassword?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        await onSubmit({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          username: fd.get("username") as string,
          password: fd.get("password") as string || "",
          role: fd.get("role") as "admin" | "user",
        });
        setLoading(false);
      }}
      className="space-y-4"
    >
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input name="name" required defaultValue={initial?.name} />
      </Field>
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input name="email" type="email" required defaultValue={initial?.email} />
      </Field>
      <Field>
        <FieldLabel>Username</FieldLabel>
        <Input name="username" required defaultValue={initial?.username} />
      </Field>
      {!noPassword && (
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input name="password" type="password" required minLength={8} />
        </Field>
      )}
      <Field>
        <FieldLabel>Role</FieldLabel>
        <select
          name="role"
          defaultValue={initial?.role || "user"}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
