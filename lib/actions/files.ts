"use server";

import { userAction, adminOnlyAction } from "@/lib/safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getAttachmentsByTask,
  getAttachmentsByComment,
  getAttachmentById,
  deleteAttachmentRecord,
} from "@/lib/data";
import { unlink } from "fs/promises";
import path from "path";

export const listTaskAttachments = userAction
  .schema(z.object({ taskId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getAttachmentsByTask(parsedInput.taskId);
  });

export const listCommentAttachments = userAction
  .schema(z.object({ commentId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getAttachmentsByComment(parsedInput.commentId);
  });

export const deleteAttachment = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const att = await getAttachmentById(parsedInput.id);
    if (!att) throw new Error("Attachment not found");

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), att.url.replace(/^\//, ""));
      await unlink(filePath);
    } catch {
      // File may already be deleted, that's fine
    }

    await deleteAttachmentRecord(parsedInput.id);
    return { success: true };
  });

export const adminDeleteAttachment = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const att = await getAttachmentById(parsedInput.id);
    if (!att) throw new Error("Attachment not found");

    try {
      const filePath = path.join(process.cwd(), att.url.replace(/^\//, ""));
      await unlink(filePath);
    } catch {}

    await deleteAttachmentRecord(parsedInput.id);
    return { success: true };
  });
