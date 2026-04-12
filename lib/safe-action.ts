import { createSafeActionClient } from "next-safe-action";
import { auth } from "./auth/auth";
import { headers } from "next/headers";
import { getCollectionWithAccess } from "./data";

export const actionClient = createSafeActionClient();

// Authenticated only action (any logged-in user)
export const userAction = actionClient
  .use(async ({ next }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    return next({ ctx: { session } });
  });

// Unauthenticated action
export const publicOnlyAction = actionClient
  .use(async ({ next }) => {
    return next({ ctx: { session: null } });
  });

// Admin action
export const adminOnlyAction = actionClient
  .use(async ({ next }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

    return next({ ctx: { session } });
  });
