import 'dotenv/config';
import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"
import { adminClient } from "better-auth/client/plugins"
import { magicLinkClient } from "better-auth/client/plugins"; 
import { ac, adminRole, viewerRole, procurementManagerRole, budgetManagerRole, userRole } from "../auth/permissions";


export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    plugins: [
        adminClient({
          ac,
          roles: { admin: adminRole, viewer: viewerRole, procurement_manager: procurementManagerRole, budget_manager: budgetManagerRole, user: userRole }
        }),
        usernameClient(),
        magicLinkClient(),
    ]
});

export const { signIn, signUp, useSession, signOut } = authClient;