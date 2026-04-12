"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  backupDatabase,
  restoreDatabase,
  resetDatabase,
  getDbStatsAction,
  listBackups,
  rollbackToBackup,
  validateBackup,
  validateBackupFile,
} from "@/lib/actions/settings";
import {
  listProcurementMembers,
  grantProcurementAccess,
  revokeProcurementAccess,
} from "@/lib/actions/procurement";
import { toast } from "sonner";
import {
  RiDownloadLine,
  RiUploadLine,
  RiDeleteBinLine,
  RiAlertLine,
  RiHistoryLine,
  RiArrowGoBackLine,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiShieldLine,
  RiAddLine,
  RiCloseCircleLine,
} from "@remixicon/react";

type Backup = {
  filename: string;
  timestamp: string;
  type: string;
  size: number;
};

type ValidationResult = {
  valid: boolean;
  issues: string[];
  summary: Record<string, number> | null;
};

const typeLabels: Record<string, string> = {
  manual: "Manual",
  "auto-pre-restore": "Auto (pre-restore)",
  "auto-pre-reset": "Auto (pre-reset)",
  "auto-pre-rollback": "Auto (pre-rollback)",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<Backup | null>(null);
  const [rollbackValidation, setRollbackValidation] = useState<ValidationResult | null>(null);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [restoreValidation, setRestoreValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Procurement access state
  const [procMembers, setProcMembers] = useState<any[]>([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantRole, setGrantRole] = useState<"read" | "write">("read");

  const loadStats = async () => {
    setLoading(true);
    const [statsRes, backupsRes, procMembersRes] = await Promise.all([
      getDbStatsAction({}),
      listBackups({}),
      listProcurementMembers({}),
    ]);
    if (statsRes?.data) setStats(statsRes.data);
    if (backupsRes?.data) setBackups(backupsRes.data);
    if (procMembersRes?.data) setProcMembers(procMembersRes.data as unknown as any[]);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleBackup = async () => {
    const res = await backupDatabase({});
    if (res?.data?.filename) {
      toast.success(
        <div className="flex items-center gap-2">
          <span>Backup created</span>
          <a
            href={`/api/backup-download/${res.data.filename}`}
            download
            className="inline-flex items-center gap-1 text-primary underline text-xs"
          >
            <RiDownloadLine className="size-3" /> Download
          </a>
        </div>
      );
      loadStats();
    } else {
      toast.error("Backup failed");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      setRestoreData(data);

      // Validate before prompting
      setValidating(true);
      const res = await validateBackup({ data });
      setValidating(false);

      if (res?.data) {
        setRestoreValidation(res.data);
      }
    } catch {
      toast.error("Invalid backup file");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmRestore = async () => {
    if (!restoreData) return;
    const res = await restoreDatabase({ data: restoreData });
    if (res?.data?.success) {
      toast.success("Database restored (auto-backup created)");
      setRestoreData(null);
      setRestoreValidation(null);
      loadStats();
    } else {
      toast.error("Restore failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReset = async () => {
    const res = await resetDatabase({});
    if (res?.data?.success) {
      toast.success("Database reset (auto-backup created)");
      setResetConfirm(false);
      loadStats();
    } else {
      toast.error("Reset failed");
    }
  };

  const handleRollback = async (backup: Backup) => {
    // Validate first
    setValidating(true);
    const res = await validateBackupFile({ filename: backup.filename });
    setValidating(false);

    if (res?.data) {
      setRollbackValidation(res.data);
      setRollbackTarget(backup);
    }
  };

  const handleGrantProcurementAccess = async () => {
    if (!grantUserId.trim()) return;
    const res = await grantProcurementAccess({ userId: grantUserId, role: grantRole });
    if (res?.data) {
      toast.success("Procurement access granted");
      setGrantUserId("");
      loadStats();
    } else {
      toast.error(res?.serverError || "Failed to grant access");
    }
  };

  const handleRevokeProcurementAccess = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke procurement access for this user?")) return;
    const res = await revokeProcurementAccess({ userId });
    if (res?.data) {
      toast.success("Procurement access revoked");
      loadStats();
    } else {
      toast.error(res?.serverError || "Failed to revoke access");
    }
  };

  const confirmRollback = async () => {
    if (!rollbackTarget) return;
    const res = await rollbackToBackup({ filename: rollbackTarget.filename });
    if (res?.data?.success) {
      toast.success("Rolled back successfully (auto-backup of previous state created)");
      setRollbackTarget(null);
      setRollbackValidation(null);
      loadStats();
    } else {
      toast.error("Rollback failed");
    }
  };

  const statEntries = [
    { key: "users", label: "Users" },
    { key: "sessions", label: "Sessions" },
    { key: "accounts", label: "Accounts" },
    { key: "verifications", label: "Verifications" },
    { key: "projects", label: "Collections" },
    { key: "tasks", label: "Tasks" },
    { key: "comments", label: "Comments" },
    { key: "members", label: "Members" },
    { key: "vendors", label: "Vendors" },
    { key: "procurements", label: "Procurements" },
    { key: "budgets", label: "Budgets" },
    { key: "budgetYears", label: "Budget Years" },
    { key: "obligations", label: "Obligations" },
    { key: "payments", label: "Payments" },
    { key: "procMembers", label: "Proc. Access" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Database management and system settings.
        </p>
      </div>

      {/* DB Stats */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Database Stats</h2>
        <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {statEntries.map((s) => (
            <div key={s.key} className="rounded-lg border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{loading ? "—" : (stats[s.key] ?? 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Procurement Access */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RiShieldLine className="size-5" />
          Procurement Access
        </h2>
        
        {/* Grant Access */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="User ID or email..."
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={grantRole}
              onChange={(e) => setGrantRole(e.target.value as "read" | "write")}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="read">Read Only</option>
              <option value="write">Read & Write</option>
            </select>
            <Button className="gap-2" onClick={handleGrantProcurementAccess}>
              <RiAddLine className="size-4" />
              Grant Access
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Grant users access to view (and optionally create) procurement data. Use the user ID or email.
          </p>
        </div>

        {/* Members List */}
        <div className="rounded-lg border">
          {procMembers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No users have procurement access yet.
            </div>
          ) : (
            <div className="divide-y">
              {procMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{m.userName}</p>
                    <p className="text-xs text-muted-foreground">{m.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        m.role === "write"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      }`}
                    >
                      {m.role}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeProcurementAccess(m.userId)}
                      title="Revoke access"
                      className="text-destructive hover:text-destructive"
                    >
                      <RiCloseCircleLine className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Backup & Restore</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={handleBackup}>
            <RiDownloadLine className="size-4" />
            Create Backup
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <RiUploadLine className="size-4" />
            Restore from File
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
        </div>
        <p className="text-xs text-muted-foreground">
          Backups are stored on the server. Restore and reset validate data and create a backup first.
        </p>
      </div>

      {/* Backup History / Rollback */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RiHistoryLine className="size-5" />
          Backup History
        </h2>
        {backups.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
            No backups yet. Create one above.
          </div>
        ) : (
          <div className="rounded-lg border">
            <div className="divide-y">
              {backups.map((b) => (
                <div key={b.filename} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {new Date(b.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[b.type] || b.type} · {formatSize(b.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/backup-download/${b.filename}`}
                      download
                      className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      <RiDownloadLine className="size-3.5" />
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleRollback(b)}
                    >
                      <RiArrowGoBackLine className="size-3.5" />
                      Rollback
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <RiAlertLine className="size-5" />
          Danger Zone
        </h2>
        <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reset Database</p>
              <p className="text-sm text-muted-foreground">
                Deletes all data except admin account. A backup is created automatically.
              </p>
            </div>
            {!resetConfirm ? (
              <Button variant="destructive" className="gap-2" onClick={() => setResetConfirm(true)}>
                <RiDeleteBinLine className="size-4" />
                Reset
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setResetConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleReset}>
                  Confirm Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restore Validation Modal */}
      {restoreValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setRestoreValidation(null); setRestoreData(null); }} />
          <div className="relative z-50 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Validate Backup</h2>
              <Button variant="ghost" size="icon" onClick={() => { setRestoreValidation(null); setRestoreData(null); }}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>

            {validating ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Validating backup...</div>
              </div>
            ) : restoreValidation.valid ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <RiCheckLine className="size-5" />
                  <span className="font-medium">Backup is valid</span>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h3 className="text-sm font-medium">Contents</h3>
                  {restoreValidation.summary && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(restoreValidation.summary).map(([key, count]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setRestoreValidation(null); setRestoreData(null); }}>
                    Cancel
                  </Button>
                  <Button onClick={confirmRestore}>Restore</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <RiErrorWarningLine className="size-5" />
                  <span className="font-medium">Backup validation failed</span>
                </div>

                {restoreValidation.issues.length > 0 && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
                    <h3 className="text-sm font-medium text-destructive">Issues found:</h3>
                    <ul className="space-y-1 text-xs text-destructive">
                      {restoreValidation.issues.map((issue, i) => (
                        <li key={i} className="flex gap-2">
                          <span>•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => { setRestoreValidation(null); setRestoreData(null); }}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rollback Validation Modal */}
      {rollbackTarget && rollbackValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setRollbackTarget(null); setRollbackValidation(null); }} />
          <div className="relative z-50 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Confirm Rollback</h2>
              <Button variant="ghost" size="icon" onClick={() => { setRollbackTarget(null); setRollbackValidation(null); }}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>

            {validating ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Validating backup...</div>
              </div>
            ) : rollbackValidation.valid ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Rollback to backup from{" "}
                  <strong>{new Date(rollbackTarget.timestamp).toLocaleString()}</strong>.
                  An auto-backup of current state will be created first.
                </p>

                {rollbackValidation.summary && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <h3 className="text-sm font-medium">Backup Contents</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(rollbackValidation.summary).map(([key, count]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setRollbackTarget(null); setRollbackValidation(null); }}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmRollback}>
                    Rollback
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <RiErrorWarningLine className="size-5" />
                  <span className="font-medium">Backup validation failed</span>
                </div>

                {rollbackValidation.issues.length > 0 && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
                    <h3 className="text-sm font-medium text-destructive">Issues found:</h3>
                    <ul className="space-y-1 text-xs text-destructive">
                      {rollbackValidation.issues.map((issue, i) => (
                        <li key={i} className="flex gap-2">
                          <span>•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => { setRollbackTarget(null); setRollbackValidation(null); }}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
