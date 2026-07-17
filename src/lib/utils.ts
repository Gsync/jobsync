import { type ClassValue, clsx } from "clsx";
import { format, parse } from "date-fns";
import { NextApiRequest } from "next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a URL to ensure it starts with "http://" or "https://".
 * If the URL does not start with either, "https://" is prepended to the URL.
 *
 * @param url - The URL string to be formatted.
 * @returns The formatted URL string.
 *
 * @example
 * // Ensures the URL starts with "https://"
 * const formattedUrl = formatUrl("example.com");
 * console.log(formattedUrl); // Output: "https://example.com"
 *
 * @example
 * // Leaves the URL unchanged if it starts with "http://"
 * const formattedUrl = formatUrl("http://example.com");
 * console.log(formattedUrl); // Output: "http://example.com"
 *
 * @example
 * // Leaves the URL unchanged if it starts with "https://"
 * const formattedUrl = formatUrl("https://example.com");
 * console.log(formattedUrl); // Output: "https://example.com"
 */
export function formatUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function handleError(error: unknown, msg = "Server Error.") {
  console.error(error, msg);
  if (error instanceof Error) {
    if (error.message === "fetch failed") {
      error.message =
        "Fetch failed, please make sure selected AI service is running.";
    }
    if ("code" in error && (error as any).code === "P2003") {
      return {
        success: false,
        message:
          "Your session appears invalid. Please sign out and sign back in.",
      };
    }
    return { success: false, message: error.message || msg };
  }
}

export function getTimestampedFileName(originalName: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");

  // Simulate path.basename: keep only the last path segment
  const segments = originalName.replace(/\\/g, "/").split("/");
  const base = segments[segments.length - 1] || "file";

  // Strip control characters
  const safe = base.replace(/[\x00-\x1f\x7f]/g, "");

  const lastDot = safe.lastIndexOf(".");
  const ext = lastDot >= 0 ? safe.slice(lastDot + 1) : "";
  const name = lastDot >= 0 ? safe.slice(0, lastDot) : safe;

  return `${name || "file"}_${timestamp}${ext ? "." + ext : ""}`;
}

export const combineDateAndTime = (date: Date, time: string): Date => {
  // Parse the time string into a `Date` object using a reference date
  const parsedTime = parse(time, "hh:mm a", new Date());
  // if (isNaN(parsedTime.getTime())) throw new Error("Invalid time format");

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    parsedTime.getHours(),
    parsedTime.getMinutes()
  );
};

export const formatElapsedTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`;
};

export const calculatePercentageDifference = (
  value1: number,
  value2: number
): number | null => {
  if (value1 === 0 && value2 === 0) {
    return 0;
  }
  if (value1 === 0) {
    return value2 !== 0 ? 100 : 0;
  }

  const difference = ((value2 - value1) / Math.abs(value1)) * 100;
  return Math.round(difference);
};

export const getLast7Days = (dateType = "PP", baseDate?: Date) => {
  const dates = [];
  const anchor = baseDate ? new Date(baseDate) : new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - i);
    dates.push(format(date, dateType));
  }
  return dates;
};
