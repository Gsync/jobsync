// Unconditional globalThis stash, as in telemetry/context.ts: Next can emit a
// module into more than one server bundle, and two queues would not serialize.
const globalForQueues = globalThis as typeof globalThis & {
  jobSaveQueuesGlobal?: Map<string, Promise<void>>;
};

const queues = globalForQueues.jobSaveQueuesGlobal ?? new Map<string, Promise<void>>();
globalForQueues.jobSaveQueuesGlobal = queues;

const settle = () => {};

// Matches db.ts's connect timeout; a normal save takes tens of milliseconds
const MAX_WAIT_MS = 5_000;

// A call stuck on a query that never returns must not hold up every later one
function waitAtMost(previous: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, MAX_WAIT_MS);
  });
  return Promise.race([previous, timeout]).finally(() => clearTimeout(timer));
}

// Runs one user's calls one after another. In-process only: a second app
// instance against the same database would need a Postgres advisory lock.
export function serializeByUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = queues.get(userId);
  const run = (previous ? waitAtMost(previous) : Promise.resolve()).then(fn);
  // The caller still gets run's rejection; the tail only orders the queue
  const tail = run.then(settle, settle);
  queues.set(userId, tail);
  void tail.then(() => {
    if (queues.get(userId) === tail) queues.delete(userId);
  });
  return run;
}
