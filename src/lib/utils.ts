import { type ClassValue, clsx } from "clsx";
import { addDays, format, subDays } from "date-fns";
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

/**
 * Generates a random integer between the specified min and max values (inclusive).
 *
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns A random integer between min and max.
 */
const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generates an array of objects, each with a 'day' in 'yyyy-MM-dd' format and a 'value'
 * that is a random number between 1 and 20. Randomly skips days based on the given probability.
 *
 * @param daysAgo - The number of day ago to start with.
 * @param skipProbability - The probability of skipping a day (default is 0.3).
 * @param formatType - Formats the date type (default is "yyyy-MM-dd")
 * @returns An array of objects with 'day' and 'value' properties.
 *
 * @example
 * // Example usage:
 * const daysAgo = 30 // for 30 days from current date
 * const randomDateValues = generateRandomDateValues(daysAgo);
 * console.log(randomDateValues);
 * FormatType: "yyyy-MM-dd" = "2024-06-23", "PP" = "Jun 23, 2024"
 */
export const generateRandomActivityCalendarData = (
  daysAgo: number,
  skipProbability: number = 0.3,
  formatType: string = "yyyy-MM-dd"
): { day: string; value: number }[] => {
  const result: { day: string; value: number }[] = [];
  const endDate = new Date();
  const startDate = subDays(new Date(), daysAgo);
  let currentDate = startDate;

  while (currentDate <= endDate) {
    // Randomly decide whether to include the current date
    if (Math.random() > skipProbability) {
      const formattedDate = format(currentDate, formatType);
      const randomValue = getRandomInt(1, 20);
      result.push({ day: formattedDate, value: randomValue });
    }
    currentDate = addDays(currentDate, 1);
  }

  return result;
};
