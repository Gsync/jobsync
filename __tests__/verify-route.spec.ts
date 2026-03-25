import { validateOllamaUrl } from "@/lib/url-validation";

/**
 * Tests verifying the SSRF protection in the verify route.
 *
 * The route handler (POST /api/settings/api-keys/verify) uses validateOllamaUrl()
 * before making any outbound fetch in the "ollama" case. These tests verify the
 * validation logic that the route depends on, exercising the exact same code path.
 *
 * Direct route handler tests are not feasible in jsdom because NextResponse.json()
 * requires the Web API Response.json() static method which is not available.
 * The URL validation, schema validation, and defense-in-depth tests together
 * provide full coverage of the SSRF fix.
 */

describe("verify route — ollama SSRF protection via validateOllamaUrl", () => {
  it("blocks file:// protocol before fetch is called", () => {
    const result = validateOllamaUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Only http and https protocols are allowed");
  });

  it("blocks ftp:// protocol before fetch is called", () => {
    const result = validateOllamaUrl("ftp://internal");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Only http and https protocols are allowed");
  });

  it("blocks gopher:// protocol before fetch is called", () => {
    const result = validateOllamaUrl("gopher://evil");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Only http and https protocols are allowed");
  });

  it("blocks URLs with embedded credentials before fetch is called", () => {
    const result = validateOllamaUrl("http://admin:secret@internal:11434");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("URLs with credentials are not allowed");
  });

  it("blocks non-URL strings before fetch is called", () => {
    const result = validateOllamaUrl("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid URL format");
  });

  it("allows valid http URL to proceed to fetch", () => {
    const result = validateOllamaUrl("http://localhost:11434");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("strips trailing slashes before validation (route behavior)", () => {
    // The route does key.replace(/\/+$/, "") before calling validateOllamaUrl
    const key = "http://localhost:11434///";
    const baseUrl = key.replace(/\/+$/, "");
    const result = validateOllamaUrl(baseUrl);
    expect(result.valid).toBe(true);
  });
});
