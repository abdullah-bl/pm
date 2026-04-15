"use server";

import { adminOnlyAction } from "@/lib/safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getCommentsByTask,
  createComment,
  deleteComment,
} from "@/lib/data";

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? "";
}

export const listProjects = adminOnlyAction
  .schema(z.object({
    page: z.number().default(1).optional(),
    limit: z.number().default(20).optional(),
    search: z.string().optional(),
  }))
  .action(async ({ parsedInput }) => {
    return getProjects(parsedInput);
  });

export const newProject = adminOnlyAction
  .schema(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    return createProject({ ...parsedInput, createdBy: userId });
  });

export const editProject = adminOnlyAction
  .schema(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["active", "archived"]).optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;
    await updateProject(id, data);
    return { success: true };
  });

export const removeProject = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await deleteProject(parsedInput.id);
    return { success: true };
  });

export const listTasks = adminOnlyAction
  .schema(z.object({ projectId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getTasksByProject(parsedInput.projectId);
  });

export const newTask = adminOnlyAction
  .schema(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.date().nullable().optional(),
      projectId: z.string(),
      assigneeId: z.string().nullable().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    return createTask({ ...parsedInput, createdBy: userId });
  });

export const editTask = adminOnlyAction
  .schema(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.date().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const { id, ...data } = parsedInput;
    await updateTask(id, data);
    return { success: true };
  });

export const removeTask = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await deleteTask(parsedInput.id);
    return { success: true };
  });

export const addComment = adminOnlyAction
  .schema(
    z.object({
      content: z.string().min(1),
      taskId: z.string(),
    })
  )
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    return createComment({ ...parsedInput, authorId: userId });
  });

export const removeComment = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await deleteComment(parsedInput.id);
    return { success: true };
  });

export const getProjectDetail = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const proj = await getProjectById(parsedInput.id);
    return proj;
  });

export const getTaskDetail = adminOnlyAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    return getTaskById(parsedInput.id);
  });

export const listComments = adminOnlyAction
  .schema(z.object({ taskId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getCommentsByTask(parsedInput.taskId);
  });
