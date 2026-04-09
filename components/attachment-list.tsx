"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { deleteAttachment, adminDeleteAttachment } from "@/lib/actions/files";
import { toast } from "sonner";
import {
  RiAttachmentLine,
  RiFileLine,
  RiImageLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiUploadLine,
  RiLoader4Line,
} from "@remixicon/react";

export type AttachmentType = {
  id: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  taskId: string;
  commentId: string | null;
  uploadedBy: string;
  createdAt: Date | number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimetype: string): boolean {
  return mimetype.startsWith("image/");
}

export function AttachmentList({
  attachments,
  taskId,
  commentId,
  canDelete = false,
  isAdmin = false,
  onAttachmentChange,
}: {
  attachments: AttachmentType[];
  taskId: string;
  commentId?: string;
  canDelete?: boolean;
  isAdmin?: boolean;
  onAttachmentChange?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      setUploading(true);
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("taskId", taskId);
      if (commentId) formData.append("commentId", commentId);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }
        toast.success("File uploaded");
        onAttachmentChange?.();
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [taskId, commentId, onAttachmentChange]
  );

  const handleDelete = async (id: string) => {
    try {
      if (isAdmin) {
        await adminDeleteAttachment({ id });
      } else {
        await deleteAttachment({ id });
      }
      toast.success("Attachment deleted");
      onAttachmentChange?.();
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <RiAttachmentLine className="size-4" />
          Attachments ({attachments.length})
        </h4>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md,.zip"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiUploadLine className="size-3.5" />
            )}
            {uploading ? "Uploading..." : "Attach"}
          </Button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 rounded-md border p-2 group"
            >
              {isImage(att.mimetype) ? (
                <a
                  href={`/api/files${att.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <img
                    src={`/api/files${att.url}`}
                    alt={att.filename}
                    className="h-10 w-10 rounded object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                  <RiFileLine className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/files${att.url}`}
                  className="text-sm font-medium hover:underline truncate block"
                  download
                >
                  {att.filename}
                </a>
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(att.size)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={`/api/files${att.url}`}
                  download
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  <RiDownloadLine className="size-3.5" />
                </a>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <RiDeleteBinLine className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
