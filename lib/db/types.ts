import type { task, project, comment, attachment, collectionMember } from "./schema";

// All types inferred from Drizzle schema — single source of truth
export type TaskStatus = typeof task.$inferSelect.status;
export type TaskPriority = typeof task.$inferSelect.priority;
export type ProjectStatus = typeof project.$inferSelect.status;
export type CollectionMemberRole = typeof collectionMember.$inferSelect.role;
export type CollectionMemberStatus = typeof collectionMember.$inferSelect.status;
