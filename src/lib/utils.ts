import { type ClassValue, clsx } from "clsx";
import { parse } from "date-fns";
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

export function handleError(error: unknown, msg = "Server Error.") {
  console.error(error, msg);
  if (error instanceof Error) {
    if (error.message === "fetch failed") {
      error.message =
        "Fetch failed, please make sure selected AI service is running.";
    }
    return { success: false, message: error.message || msg };
  }
}

export function getTimestampedFileName(originalName: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-") // Replace colons with dashes for file system compatibility
    .replace(/\..+/, ""); // Remove milliseconds

  const extension = originalName.split(".").pop();
  const baseName = originalName.replace(`.${extension}`, "");

  return `${baseName}_${timestamp}.${extension}`;
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
