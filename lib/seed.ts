import { db } from "./db"
import { user } from "./db/schema"

(async () => {
    // list all users
    const users = await db.select().from(user)
    console.log(users)

    if (users.length === 0) {
        await db.insert(user).values({
            id: "1",
            email: "admin@pm.app",
            name: "Admin User",
            role: "admin",
            username: "admin",
            displayUsername: "Admin",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            banned: false,
            banReason: null,
            banExpires: null,
        })
        console.log("Admin user created")
    } else {
        console.log("Admin user already exists")
    }
})().catch(console.error)
