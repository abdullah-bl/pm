"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RiErrorWarningLine } from "@remixicon/react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <RiErrorWarningLine className="mx-auto size-12 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Dashboard Error</h1>
          <p className="text-muted-foreground">
            Something went wrong in the admin dashboard.
          </p>
        </div>
        {error.message && (
          <p className="rounded-md bg-muted p-3 text-sm font-mono">
            {error.message}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
