import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { notFound } from "next/navigation"


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session || session.user.role !== "admin") {
        return notFound()
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            {children}
        </div>
    )
}