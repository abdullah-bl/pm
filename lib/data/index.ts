import { db } from "@/lib/db";
import { user, session, account, verification, project, task, comment } from "@/lib/db/schema";
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
  const [userCount, sessionCount, projectCount, taskCount] = await Promise.all([
    getUserCount(),
    getSessionCount(),
    getProjectCount(),
    getTaskCount(),
  ]);

  return {
    totalUsers: userCount,
    activeSessions: sessionCount,
    projects: projectCount,
    tasks: taskCount,
  };
}

export async function getDbStats() {
  const [users, sessions, accounts, verifications, projects, tasks, comments] = await Promise.all([
    getUserCount(),
    getSessionCount(),
    getAccountCount(),
    getVerificationCount(),
    getProjectCount(),
    getTaskCount(),
    getCommentCount(),
  ]);

  return { users, sessions, accounts, verifications, projects, tasks, comments };
}

export async function getAllTableData() {
  const [users, sessions, accounts, verifications, projects, tasks, comments] = await Promise.all([
    db.select().from(user),
    db.select().from(session),
    db.select().from(account),
    db.select().from(verification),
    db.select().from(project),
    db.select().from(task),
    db.select().from(comment),
  ]);
  return { users, sessions, accounts, verifications, projects, tasks, comments };
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
  await db.delete(project);
  await db.delete(verification);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user);
}

export async function clearNonAdminTables() {
  await db.delete(comment);
  await db.delete(task);
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
