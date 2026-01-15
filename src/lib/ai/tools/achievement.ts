/**
 * Achievement Analysis Tools
 * Extract and analyze quantified achievements from text
 */

/**
 * Extract and count quantified achievements (numbers, percentages, metrics)
 */
export function countQuantifiedAchievements(text: string): {
  count: number;
  examples: string[];
} {
  // Match patterns like: "40%", "$2M", "5+ years", "Increased by 50%"
  const patterns = [
    /\d+%/g, // Percentages: 40%
    /\$[\d,]+[KMB]?/g, // Money: $2M, $500K
    /\d+\+?\s*(years?|months?|weeks?)/gi, // Time: 5+ years
    /(increased|decreased|improved|reduced|grew|boosted)\s+by\s+\d+/gi, // Actions with numbers
    /\d+x\s+(faster|better|more)/gi, // Multipliers: 2x faster
    /team\s+of\s+\d+/gi, // Team size: team of 12
    /\d+\s+(clients?|customers?|users?|projects?)/gi, // Quantities
  ];

  const matches = new Set<string>();
  patterns.forEach((pattern) => {
    const found = text.match(pattern);
    if (found) {
      found.forEach((m) => matches.add(m));
    }
  });

  const examples = Array.from(matches).slice(0, 5); // Top 5 examples
  return { count: matches.size, examples };
}
