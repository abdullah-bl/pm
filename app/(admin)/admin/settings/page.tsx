"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  backupDatabase,
  restoreDatabase,
  resetDatabase,
  getDbStatsAction,
  listBackups,
  rollbackToBackup,
} from "@/lib/actions/settings";
import { toast } from "sonner";
import {
  RiDownloadLine,
  RiUploadLine,
  RiDeleteBinLine,
  RiAlertLine,
  RiHistoryLine,
  RiArrowGoBackLine,
  RiCloseLine,
} from "@remixicon/react";

type Backup = {
  filename: string;
  timestamp: string;
  type: string;
  size: number;
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
  const fileRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    setLoading(true);
    const [statsRes, backupsRes] = await Promise.all([getDbStatsAction({}), listBackups({})]);
    if (statsRes?.data) setStats(statsRes.data);
    if (backupsRes?.data) setBackups(backupsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleBackup = async () => {
    const res = await backupDatabase({});
    if (res?.data?.filename) {
      toast.success("Backup created: " + res.data.filename);
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
      if (!data.users) throw new Error("Invalid backup file");
      const res = await restoreDatabase({ data });
      if (res?.data?.success) {
        toast.success("Database restored (auto-backup created)");
        loadStats();
      } else {
        toast.error("Restore failed");
      }
    } catch {
      toast.error("Invalid backup file");
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
    const res = await rollbackToBackup({ filename: backup.filename });
    if (res?.data?.success) {
      toast.success("Rolled back successfully (auto-backup of previous state created)");
      setRollbackTarget(null);
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
        <div className="grid gap-4 sm:grid-cols-4">
          {statEntries.map((s) => (
            <div key={s.key} className="rounded-lg border bg-card p-4 space-y-1">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{loading ? "—" : (stats[s.key] ?? 0)}</p>
            </div>
          ))}
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
          Backups are stored on the server. Restore and reset automatically create a backup first.
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setRollbackTarget(b)}
                  >
                    <RiArrowGoBackLine className="size-3.5" />
                    Rollback
                  </Button>
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
                Deletes all data except the admin account. A backup is created automatically.
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

      {/* Rollback Confirmation Modal */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setRollbackTarget(null)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Confirm Rollback</h2>
              <Button variant="ghost" size="icon" onClick={() => setRollbackTarget(null)}>
                <RiCloseLine className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will replace all current data with the backup from{" "}
                <strong>{new Date(rollbackTarget.timestamp).toLocaleString()}</strong>.
                An auto-backup of the current state will be created first.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRollbackTarget(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => handleRollback(rollbackTarget)}>
                  Rollback
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
