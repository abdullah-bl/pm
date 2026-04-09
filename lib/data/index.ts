import { db } from "@/lib/db";
import { user, session, account, verification, project, task, comment, collectionMember, attachment } from "@/lib/db/schema";
import { eq, count, not, ilike, or, and, desc, sql as sqlOp } from "drizzle-orm";

export async function getUserCount() {
  const result = await db.select({ count: count() }).from(user);
  return result[0].count;
}

export async function getSessionCount() {
  const result = await db.select({ count: count() }).from(session);
  return result[0].count;
}

export async function getAccountCount() {
  const result = await db.select({ count: count() }).from(account);
  return result[0].count;
}

export async function getVerificationCount() {
  const result = await db.select({ count: count() }).from(verification);
  return result[0].count;
}

export async function getProjectCount() {
  const result = await db.select({ count: count() }).from(project);
  return result[0].count;
}

export async function getTaskCount() {
  const result = await db.select({ count: count() }).from(task);
  return result[0].count;
}

export async function getCommentCount() {
  const result = await db.select({ count: count() }).from(comment);
  return result[0].count;
}

export async function getDashboardStats() {
  const [userCount, sessionCount, projectCount, taskCount, memberCount] = await Promise.all([
    getUserCount(),
    getSessionCount(),
    getProjectCount(),
    getTaskCount(),
    getCollectionMemberCount(),
  ]);

  return {
    totalUsers: userCount,
    activeSessions: sessionCount,
    collections: projectCount,
    tasks: taskCount,
    members: memberCount,
  };
}

export async function getDbStats() {
  const [users, sessions, accounts, verifications, projects, tasks, comments, members] = await Promise.all([
    getUserCount(),
    getSessionCount(),
    getAccountCount(),
    getVerificationCount(),
    getProjectCount(),
    getTaskCount(),
    getCommentCount(),
    getCollectionMemberCount(),
  ]);

  return { users, sessions, accounts, verifications, projects, tasks, comments, members };
}

export async function getAllTableData() {
  const [users, sessions, accounts, verifications, projects, tasks, comments, members] = await Promise.all([
    db.select().from(user),
    db.select().from(session),
    db.select().from(account),
    db.select().from(verification),
    db.select().from(project),
    db.select().from(task),
    db.select().from(comment),
    db.select().from(collectionMember),
  ]);
  return { users, sessions, accounts, verifications, projects, tasks, comments, members };
}

export async function listUsersPaginated(opts: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}) {
  const { page, limit, search, role } = opts;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(user.name, `%${search}%`),
        ilike(user.email, `%${search}%`),
        ilike(user.username, `%${search}%`)
      )!
    );
  }
  if (role && role !== "all") {
    conditions.push(eq(user.role, role));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, totalResult] = await Promise.all([
    db
      .select()
      .from(user)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(user.createdAt),
    db.select({ count: count() }).from(user).where(where),
  ]);

  return {
    users,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

export async function clearAllTables() {
  await db.delete(comment);
  await db.delete(task);
  await db.delete(collectionMember);
  await db.delete(project);
  await db.delete(verification);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user);
}

export async function clearNonAdminTables() {
  await db.delete(comment);
  await db.delete(task);
  await db.delete(collectionMember);
  await db.delete(project);
  await db.delete(verification);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user).where(not(eq(user.role, "admin")));
}

export async function insertAllData(data: {
  users?: any[];
  sessions?: any[];
  accounts?: any[];
  verifications?: any[];
  projects?: any[];
  tasks?: any[];
  comments?: any[];
  members?: any[];
}) {
  if (data.users?.length) {
    for (const u of data.users) {
      try { await db.insert(user).values(u); } catch {}
    }
  }
  if (data.projects?.length) {
    for (const p of data.projects) {
      try { await db.insert(project).values(p); } catch {}
    }
  }
  if (data.members?.length) {
    for (const m of data.members) {
      try { await db.insert(collectionMember).values(m); } catch {}
    }
  }
  if (data.tasks?.length) {
    for (const t of data.tasks) {
      try { await db.insert(task).values(t); } catch {}
    }
  }
  if (data.comments?.length) {
    for (const c of data.comments) {
      try { await db.insert(comment).values(c); } catch {}
    }
  }
  if (data.accounts?.length) {
    for (const a of data.accounts) {
      try { await db.insert(account).values(a); } catch {}
    }
  }
  if (data.sessions?.length) {
    for (const s of data.sessions) {
      try { await db.insert(session).values(s); } catch {}
    }
  }
  if (data.verifications?.length) {
    for (const v of data.verifications) {
      try { await db.insert(verification).values(v); } catch {}
    }
  }
}

export async function setRoleByEmail(email: string, role: string) {
  await db.update(user).set({ role }).where(eq(user.email, email));
}

export async function updateUserData(
  id: string,
  data: { name: string; email: string; username: string; role: string }
) {
  await db.update(user).set(data).where(eq(user.id, id));
}

export async function deleteUserData(id: string) {
  await db.delete(user).where(eq(user.id, id));
}

export async function banUserData(id: string, reason?: string) {
  await db
    .update(user)
    .set({ banned: true, banReason: reason || null, banExpires: null })
    .where(eq(user.id, id));
}

export async function unbanUserData(id: string) {
  await db
    .update(user)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(eq(user.id, id));
}

// --- Project queries ---

export async function getProjects() {
  return db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount: sqlOp<number>`count(${task.id})`,
    })
    .from(project)
    .leftJoin(task, eq(project.id, task.projectId))
    .groupBy(project.id)
    .orderBy(desc(project.createdAt));
}

export async function getProjectById(id: string) {
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.id, id));
  return rows[0] ?? null;
}

export async function createProject(data: {
  name: string;
  description?: string;
  createdBy: string;
}) {
  const result = await db.insert(project).values(data).returning();
  return result[0];
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; status?: "active" | "archived" }
) {
  await db.update(project).set(data).where(eq(project.id, id));
}

export async function deleteProject(id: string) {
  await db.delete(project).where(eq(project.id, id));
}

// --- Task queries ---

export async function getTasksByProject(projectId: string) {
  return db
    .select({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assigneeName: user.name,
      assigneeImage: user.image,
    })
    .from(task)
    .leftJoin(user, eq(task.assigneeId, user.id))
    .where(eq(task.projectId, projectId))
    .orderBy(desc(task.createdAt));
}

export async function getTaskById(id: string) {
  const rows = await db
    .select({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assigneeName: user.name,
      assigneeImage: user.image,
    })
    .from(task)
    .leftJoin(user, eq(task.assigneeId, user.id))
    .where(eq(task.id, id));
  return rows[0] ?? null;
}

export async function createTask(data: {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "in_review" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: Date | null;
  projectId: string;
  assigneeId?: string | null;
  createdBy: string;
}) {
  const result = await db.insert(task).values(data).returning();
  return result[0];
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: "todo" | "in_progress" | "in_review" | "done";
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: Date | null;
    assigneeId?: string | null;
  }
) {
  await db.update(task).set(data).where(eq(task.id, id));
}

export async function deleteTask(id: string) {
  await db.delete(task).where(eq(task.id, id));
}

// --- Comment queries ---

export async function getCommentsByTask(taskId: string) {
  return db
    .select({
      id: comment.id,
      content: comment.content,
      taskId: comment.taskId,
      authorId: comment.authorId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comment)
    .leftJoin(user, eq(comment.authorId, user.id))
    .where(eq(comment.taskId, taskId))
    .orderBy(comment.createdAt);
}

export async function createComment(data: {
  content: string;
  taskId: string;
  authorId: string;
}) {
  const result = await db.insert(comment).values(data).returning();
  return result[0];
}

export async function deleteComment(id: string) {
  await db.delete(comment).where(eq(comment.id, id));
}

// --- Collection member / access queries ---

export async function getCollectionsForUser(userId: string) {
  // Collections the user owns
  const owned = await db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      role: sqlOp<string>`'admin'`.as("role"),
      taskCount: sqlOp<number>`0`.as("taskCount"),
    })
    .from(project)
    .where(eq(project.createdBy, userId));

  // Get task counts for owned
  for (const col of owned) {
    const [row] = await db
      .select({ count: count() })
      .from(task)
      .where(eq(task.projectId, col.id));
    col.taskCount = row.count;
  }

  // Collections the user is a member of
  const memberOf = await db
    .select({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      role: collectionMember.role,
    })
    .from(collectionMember)
    .innerJoin(project, eq(collectionMember.collectionId, project.id))
    .where(
      and(
        eq(collectionMember.userId, userId),
        eq(collectionMember.status, "accepted"),
        not(eq(project.createdBy, userId)),
      )
    );

  // Get task counts for member collections
  for (const col of memberOf) {
    const [row] = await db
      .select({ count: count() })
      .from(task)
      .where(eq(task.projectId, col.id));
    (col as any).taskCount = row.count;
  }

  return {
    owned: owned.map((c) => ({ ...c, role: "admin" as const })),
    shared: memberOf.map((c) => ({ ...c, taskCount: (c as any).taskCount || 0 })),
  };
}

export async function getCollectionWithAccess(collectionId: string, userId: string) {
  // Check if user is the owner
  const [proj] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, collectionId), eq(project.createdBy, userId)));

  if (proj) {
    return { collection: proj, role: "admin" as const };
  }

  // Check if user is a member
  const [membership] = await db
    .select({ role: collectionMember.role, status: collectionMember.status })
    .from(collectionMember)
    .where(
      and(
        eq(collectionMember.collectionId, collectionId),
        eq(collectionMember.userId, userId),
        eq(collectionMember.status, "accepted"),
      )
    );

  if (!membership) {
    // Admin users can always access
    const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
    if (u?.role === "admin") {
      const [col] = await db.select().from(project).where(eq(project.id, collectionId));
      return col ? { collection: col, role: "admin" as const } : null;
    }
    return null;
  }

  const [col] = await db.select().from(project).where(eq(project.id, collectionId));
  return col ? { collection: col, role: membership.role as "admin" | "write" | "read" } : null;
}

export async function checkCollectionAccess(
  collectionId: string,
  userId: string,
  requiredRole?: "admin" | "write" | "read"
) {
  const access = await getCollectionWithAccess(collectionId, userId);
  if (!access) return null;

  if (!requiredRole) return access.role;

  const roleHierarchy = { read: 0, write: 1, admin: 2 };
  if (roleHierarchy[access.role] >= roleHierarchy[requiredRole]) {
    return access.role;
  }
  return null;
}

export async function addCollectionMember(data: {
  collectionId: string;
  userId: string;
  role?: "admin" | "write" | "read";
  status?: "pending" | "accepted";
}) {
  const result = await db
    .insert(collectionMember)
    .values({
      collectionId: data.collectionId,
      userId: data.userId,
      role: data.role || "write",
      status: data.status || "accepted",
      acceptedAt: data.status === "accepted" ? new Date() : null,
    })
    .returning();
  return result[0];
}

export async function updateCollectionMember(
  collectionId: string,
  userId: string,
  data: { role?: "admin" | "write" | "read"; status?: "pending" | "accepted" }
) {
  const updates: any = { ...data };
  if (data.status === "accepted") {
    updates.acceptedAt = new Date();
  }
  await db
    .update(collectionMember)
    .set(updates)
    .where(
      and(
        eq(collectionMember.collectionId, collectionId),
        eq(collectionMember.userId, userId),
      )
    );
}

export async function removeCollectionMember(collectionId: string, userId: string) {
  await db
    .delete(collectionMember)
    .where(
      and(
        eq(collectionMember.collectionId, collectionId),
        eq(collectionMember.userId, userId),
      )
    );
}

export async function getCollectionMembers(collectionId: string) {
  return db
    .select({
      id: collectionMember.id,
      collectionId: collectionMember.collectionId,
      userId: collectionMember.userId,
      role: collectionMember.role,
      status: collectionMember.status,
      invitedAt: collectionMember.invitedAt,
      acceptedAt: collectionMember.acceptedAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(collectionMember)
    .innerJoin(user, eq(collectionMember.userId, user.id))
    .where(eq(collectionMember.collectionId, collectionId));
}

export async function getMemberCount(collectionId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(collectionMember)
    .where(eq(collectionMember.collectionId, collectionId));
  return row.count;
}

// Updated stats to include collection members
export async function getCollectionMemberCount() {
  const result = await db.select({ count: count() }).from(collectionMember);
  return result[0].count;
}

// --- Attachment queries ---

export async function getAttachmentsByTask(taskId: string) {
  return db
    .select({
      id: attachment.id,
      url: attachment.url,
      filename: attachment.filename,
      mimetype: attachment.mimetype,
      size: attachment.size,
      taskId: attachment.taskId,
      commentId: attachment.commentId,
      uploadedBy: attachment.uploadedBy,
      createdAt: attachment.createdAt,
    })
    .from(attachment)
    .where(eq(attachment.taskId, taskId))
    .orderBy(attachment.createdAt);
}

export async function getAttachmentsByComment(commentId: string) {
  return db
    .select()
    .from(attachment)
    .where(eq(attachment.commentId, commentId))
    .orderBy(attachment.createdAt);
}

export async function getAttachmentById(id: string) {
  const rows = await db
    .select()
    .from(attachment)
    .where(eq(attachment.id, id));
  return rows[0] ?? null;
}

export async function createAttachment(data: {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  taskId: string;
  commentId?: string | null;
  uploadedBy: string;
}) {
  const result = await db.insert(attachment).values(data).returning();
  return result[0];
}

export async function deleteAttachmentRecord(id: string) {
  await db.delete(attachment).where(eq(attachment.id, id));
}
