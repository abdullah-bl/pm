import 'dotenv/config';
import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"
import { adminClient } from "better-auth/client/plugins"
import { magicLinkClient } from "better-auth/client/plugins"; 


export const { signIn, signUp, useSession, signOut } = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    plugins: [
        adminClient(),
        usernameClient(),
        magicLinkClient(),
    ]
})