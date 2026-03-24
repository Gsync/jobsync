"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Try again
        </button>
      </div>
    </div>
  );
}
