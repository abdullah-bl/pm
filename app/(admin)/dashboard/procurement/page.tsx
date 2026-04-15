"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminProcurementRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new overview page
    router.replace("/dashboard/procurement/overview");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-96">
      <p className="text-muted-foreground">Redirecting to procurement overview...</p>
    </div>
  );
}
