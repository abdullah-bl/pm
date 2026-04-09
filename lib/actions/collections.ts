"use server";

import { userAction } from "@/lib/safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getCollectionsForUser,
  getCollectionWithAccess,
  createProject,
  getTasksByProject,
  getTaskById,
  createTask,
  updateTask,
  createComment,
  getCommentsByTask,
  addCollectionMember,
  removeCollectionMember,
  updateCollectionMember,
  getCollectionMembers,
  getProjectById,
  updateProject,
  deleteProject,
  deleteTask,
  deleteComment,
  checkCollectionAccess,
  listUsersPaginated,
} from "@/lib/data";

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? "";
}

// --- Collections ---

export const getMyCollections = userAction
  .schema(z.object({}))
  .action(async () => {
    const userId = await getCurrentUserId();
    return getCollectionsForUser(userId);
  });

export const getUserCollectionDetail = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await getCollectionWithAccess(parsedInput.id, userId);
    if (!access) return { collection: null, role: null };
    return { collection: access.collection, role: access.role };
  });

export const createCollection = userAction
  .schema(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const col = await createProject({ ...parsedInput, createdBy: userId });
    // Creator is automatically admin - no need to add as member
    return col;
  });

export const editCollection = userAction
  .schema(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["active", "archived"]).optional(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.id, userId, "admin");
    if (!access) throw new Error("No access");
    const { id, ...data } = parsedInput;
    await updateProject(id, data);
    return { success: true };
  });

export const removeCollection = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.id, userId, "admin");
    if (!access) throw new Error("No access");
    await deleteProject(parsedInput.id);
    return { success: true };
  });

// --- Tasks ---

export const getUserTasks = userAction
  .schema(z.object({ collectionId: z.string() }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, userId, "read");
    if (!access) throw new Error("No access");
    return getTasksByProject(parsedInput.collectionId);
  });

export const createUserTask = userAction
  .schema(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.date().nullable().optional(),
    collectionId: z.string(),
    assigneeId: z.string().nullable().optional(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, userId, "write");
    if (!access) throw new Error("No access");
    const { collectionId, ...taskData } = parsedInput;
    return createTask({ ...taskData, projectId: collectionId, createdBy: userId });
  });

export const editUserTask = userAction
  .schema(z.object({
    id: z.string(),
    collectionId: z.string(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.date().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, userId, "write");
    if (!access) throw new Error("No access");
    const { id, collectionId, ...data } = parsedInput;
    await updateTask(id, data);
    return { success: true };
  });

export const removeUserTask = userAction
  .schema(z.object({ id: z.string(), collectionId: z.string() }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, userId, "write");
    if (!access) throw new Error("No access");
    await deleteTask(parsedInput.id);
    return { success: true };
  });

// --- Comments ---

export const getUserComments = userAction
  .schema(z.object({ taskId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getCommentsByTask(parsedInput.taskId);
  });

export const addUserComment = userAction
  .schema(z.object({
    content: z.string().min(1),
    taskId: z.string(),
  }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    return createComment({ ...parsedInput, authorId: userId });
  });

export const removeUserComment = userAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput }) => {
    await deleteComment(parsedInput.id);
    return { success: true };
  });

// --- Members ---

export const getMembers = userAction
  .schema(z.object({ collectionId: z.string() }))
  .action(async ({ parsedInput }) => {
    const userId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, userId, "read");
    if (!access) throw new Error("No access");
    // Also get the owner info
    const collection = await getProjectById(parsedInput.collectionId);
    const members = await getCollectionMembers(parsedInput.collectionId);
    return { collection, members, userRole: access };
  });

export const inviteMember = userAction
  .schema(z.object({
    collectionId: z.string(),
    userId: z.string(),
    role: z.enum(["admin", "write", "read"]).default("write"),
  }))
  .action(async ({ parsedInput }) => {
    const currentUserId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, currentUserId, "admin");
    if (!access) throw new Error("No access");
    await addCollectionMember({
      collectionId: parsedInput.collectionId,
      userId: parsedInput.userId,
      role: parsedInput.role,
    });
    return { success: true };
  });

export const changeMemberRole = userAction
  .schema(z.object({
    collectionId: z.string(),
    userId: z.string(),
    role: z.enum(["admin", "write", "read"]),
  }))
  .action(async ({ parsedInput }) => {
    const currentUserId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, currentUserId, "admin");
    if (!access) throw new Error("No access");
    await updateCollectionMember(parsedInput.collectionId, parsedInput.userId, {
      role: parsedInput.role,
    });
    return { success: true };
  });

export const kickMember = userAction
  .schema(z.object({
    collectionId: z.string(),
    userId: z.string(),
  }))
  .action(async ({ parsedInput }) => {
    const currentUserId = await getCurrentUserId();
    const access = await checkCollectionAccess(parsedInput.collectionId, currentUserId, "admin");
    if (!access) throw new Error("No access");
    await removeCollectionMember(parsedInput.collectionId, parsedInput.userId);
    return { success: true };
  });

// --- User search for invitations ---

export const searchUsers = userAction
  .schema(z.object({
    search: z.string().min(1),
    collectionId: z.string(),
  }))
  .action(async ({ parsedInput }) => {
    const results = await listUsersPaginated({
      page: 1,
      limit: 10,
      search: parsedInput.search,
    });
    // Filter out users already in the collection
    const members = await getCollectionMembers(parsedInput.collectionId);
    const memberIds = new Set(members.map((m) => m.userId));
    const collection = await getProjectById(parsedInput.collectionId);
    if (collection) memberIds.add(collection.createdBy);
    return results.users
      .filter((u) => !memberIds.has(u.id))
      .map((u) => ({ id: u.id, name: u.name, email: u.email, username: u.username }));
  });
