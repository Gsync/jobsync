export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runSeed } = await import("@/lib/seed");
    await runSeed();

    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
