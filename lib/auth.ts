import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db"; // your drizzle instance
import { username } from "better-auth/plugins"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js";




export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite", // or "mysql", "sqlite"
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        admin(),
        username(),
        nextCookies()
    ]
});