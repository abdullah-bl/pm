import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; // your drizzle instance
import { username } from "better-auth/plugins"
import { admin } from "better-auth/plugins"
import { ac, adminRole, viewerRole, procurementManagerRole, budgetManagerRole, userRole } from "./permissions"
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { sendEmail } from "../email";   




export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite", // or "mysql", "sqlite"
    }),
    emailAndPassword: {
        enabled: false,
    },
    plugins: [
        admin({
          ac,
          roles: { admin: adminRole, viewer: viewerRole, procurement_manager: procurementManagerRole, budget_manager: budgetManagerRole, user: userRole }
        }),
        username(),
        nextCookies(),
        magicLink({
            sendMagicLink: async ({ email, token, url, metadata }, ctx) => { 
                // send email to user
                // const magicLinkUrl = `${process.env.BETTER_AUTH_URL}/magic-link?token=${token}`;
                console.log("Generated magic link URL:", url);
                await sendEmail(
                    email,
                    "Your Magic Link",
                    `<p>Click the link below to sign in:</p>
                     <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;">Sign In</a></p>
                     <p style="color:#888;font-size:12px;">If you didn't request this, ignore this email.</p>`
                );
            }
        }),
    ]
});