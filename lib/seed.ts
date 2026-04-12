import { auth } from "./auth/auth"
import { db } from "./db"
import { user } from "./db/schema/auth-schema"
import { eq } from "drizzle-orm"

const ADMIN_PASSWORD = "admin@pm.app" as string

(async () => {
    try {
        const existingAdmin = await db.select().from(user).where(eq(user.email, "admin@pm.app")).limit(1)

        if (existingAdmin.length === 0) {
            await auth.api.createUser({
                body: {
                    email: "admin@pm.app",
                    password: ADMIN_PASSWORD,
                    name: "Admin",
                    role: "admin",
                },
            })
            console.log("Admin user created")
        } else {
            console.log("Admin user already exists")
        }
    } catch (error: any) {
        console.error("Error creating admin:", error)
    }
})().catch(console.error)
