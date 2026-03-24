"use client";
import Link from "next/link";
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Try again
          </button>
          <Link href="/dashboard" className="px-4 py-2 border rounded-md hover:bg-accent">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
