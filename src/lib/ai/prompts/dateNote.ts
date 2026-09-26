/**
 * Date Note
 * Tells the model today's date. Without it the model falls back to its
 * training cutoff and treats recent resume dates as the future (issue #123).
 */

// Everything in UTC so the ISO date, month and year can never disagree.
// Small models need both years spelled out, not just today's date.
export function buildDateNote(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = `${now.toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${year}`;
  const thisYear = now.getUTCMonth() === 0 ? month : `January through ${month}`;
  return `Today's date is ${now.toISOString().slice(0, 10)} (${month}). Every date up to ${month} — including all of ${year - 1} and earlier, and ${thisYear} — is in the past.`;
}
