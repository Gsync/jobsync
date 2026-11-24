import fc from "fast-check";

// Reproduce a failure with FC_SEED=<seed from the message> npm run test:property
fc.configureGlobal({
  seed: Number(process.env.FC_SEED ?? 20261123),
  numRuns: Number(process.env.FC_RUNS ?? 200),
});
