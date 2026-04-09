import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const project = sqliteTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "archived"] })
    .default("active")
    .notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const task = sqliteTable(
  "task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["todo", "in_progress", "in_review", "done"],
    })
      .default("todo")
      .notNull(),
    priority: text("priority", {
      enum: ["low", "medium", "high", "urgent"],
    })
      .default("medium")
      .notNull(),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("task_projectId_idx").on(table.projectId)],
);

export const comment = sqliteTable(
  "comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    content: text("content").notNull(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("comment_taskId_idx").on(table.taskId)],
);

export const collectionMember = sqliteTable(
  "collection_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    collectionId: text("collection_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "write", "read"] })
      .default("write")
      .notNull(),
    status: text("status", { enum: ["pending", "accepted"] })
      .default("accepted")
      .notNull(),
    invitedAt: integer("invited_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("collection_member_collectionId_idx").on(table.collectionId),
    index("collection_member_userId_idx").on(table.userId),
  ],
);

export const projectRelations = relations(project, ({ many, one }) => ({
  tasks: many(task),
  creator: one(user, {
    fields: [project.createdBy],
    references: [user.id],
  }),
  members: many(collectionMember),
}));

export const collectionMemberRelations = relations(collectionMember, ({ one }) => ({
  collection: one(project, {
    fields: [collectionMember.collectionId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [collectionMember.userId],
    references: [user.id],
  }),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  assignee: one(user, {
    fields: [task.assigneeId],
    references: [user.id],
  }),
  creator: one(user, {
    fields: [task.createdBy],
    references: [user.id],
  }),
  comments: many(comment),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  task: one(task, {
    fields: [comment.taskId],
    references: [task.id],
  }),
  author: one(user, {
    fields: [comment.authorId],
    references: [user.id],
  }),
}));
