import { auth } from "./auth"

const ADMIN_PASSWORD = "admin@pm.app" as string

(async () => {
    try {
        await auth.api.signUpEmail({
            body: {
                email: "admin@pm.app",
                password: ADMIN_PASSWORD,
                name: "Admin User",
            },
        })
        console.log("Admin user created")
    } catch (error: any) {
        if (error?.cause?.code === "USER_ALREADY_EXISTS") {
            console.log("Admin user already exists")
        } else {
            console.error("Error creating admin:", error)
        }
    }
})().catch(console.error)
