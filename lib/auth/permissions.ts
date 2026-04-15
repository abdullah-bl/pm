import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  procurement: ["create", "read", "update", "delete", "award", "cancel", "suspend"] as const,
  vendor: ["create", "read", "update", "delete"] as const,
  budget: ["create", "read", "update", "delete", "transfer", "close", "freeze"] as const,
  obligation: ["create", "read", "cancel"] as const,
  payment: ["create", "read", "approve", "reject", "mark-paid"] as const,
} as const;

export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
  ...adminAc.statements,
  procurement: ["create", "read", "update", "delete", "award", "cancel", "suspend"],
  vendor: ["create", "read", "update", "delete"],
  budget: ["create", "read", "update", "delete", "transfer", "close", "freeze"],
  obligation: ["create", "read", "cancel"],
  payment: ["create", "read", "approve", "reject", "mark-paid"],
});

export const viewerRole = ac.newRole({
  procurement: ["read"],
  vendor: ["read"],
  budget: ["read"],
  obligation: ["read"],
  payment: ["read"],
});

export const procurementManagerRole = ac.newRole({
  procurement: ["create", "read", "update", "award", "cancel", "suspend"],
  vendor: ["create", "read", "update"],
  budget: ["read"],
  obligation: ["create", "read", "cancel"],
  payment: ["create", "read"],
});

export const budgetManagerRole = ac.newRole({
  procurement: ["read"],
  vendor: ["read"],
  budget: ["create", "read", "update", "transfer", "close", "freeze"],
  obligation: ["create", "read", "cancel"],
  payment: ["create", "read", "approve", "reject", "mark-paid"],
});

export const userRole = ac.newRole({
  user: adminAc.statements.user,
});
