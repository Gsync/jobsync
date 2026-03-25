"use client";

/**
 * Root-level error boundary for the Next.js App Router.
 * Catches errors that error.tsx cannot (e.g., layout errors).
 * Uses minimal inline styles since no layout/theme is available.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 480, padding: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              Something went wrong
            </h1>
            <p style={{ color: "#666", marginBottom: 20 }}>{error.message}</p>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                backgroundColor: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
