/**
 * Text Formatting Analysis Tools
 * Analyze text structure and formatting quality
 */

/**
 * Analyze text structure and formatting quality
 */
export function analyzeFormatting(text: string): {
  hasBulletPoints: boolean;
  hasConsistentSpacing: boolean;
  averageLineLength: number;
  sectionCount: number;
} {
  const lines = text.split("\n");
  const bulletLines = lines.filter(
    (line) =>
      line.trim().startsWith("•") ||
      line.trim().startsWith("-") ||
      line.trim().startsWith("*")
  );

  const hasBulletPoints = bulletLines.length > 3;

  // Count potential sections (all caps lines or lines ending with :)
  const sectionHeaders = lines.filter(
    (line) =>
      (line.trim().length > 0 && line === line.toUpperCase()) ||
      line.trim().endsWith(":")
  );

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const averageLineLength =
    nonEmptyLines.reduce((sum, line) => sum + line.length, 0) /
    Math.max(nonEmptyLines.length, 1);

  return {
    hasBulletPoints,
    hasConsistentSpacing: averageLineLength > 20 && averageLineLength < 100,
    averageLineLength: Math.round(averageLineLength),
    sectionCount: sectionHeaders.length,
  };
}
