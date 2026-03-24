"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1>Something went wrong</h1>
            <p>{error.message}</p>
            <button onClick={reset}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}
