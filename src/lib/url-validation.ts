/**
 * URL validation utilities for preventing SSRF attacks.
 *
 * Used to validate user-supplied URLs (e.g. Ollama base URL) before
 * the server makes outbound fetch requests to them.
 */

export function validateOllamaUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || url.trim() === "") {
    return { valid: false, error: "URL must not be empty" };
  }

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        valid: false,
        error: "Only http and https protocols are allowed",
      };
    }

    if (parsed.username || parsed.password) {
      return { valid: false, error: "URLs with credentials are not allowed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}
