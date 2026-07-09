import { describe, expect, it } from "vitest";
import { companyBoardUrl } from "@/lib/atsBoardUrl";
import { APP_CONSTANTS } from "@/lib/constants";

describe("companyBoardUrl", () => {
  it("builds a Greenhouse board URL from the token", () => {
    expect(companyBoardUrl("greenhouse", { token: "anthropic" })).toBe(
      `${APP_CONSTANTS.GREENHOUSE_BOARD_URL}/anthropic`,
    );
  });

  it("uses the US Lever host by default", () => {
    expect(companyBoardUrl("lever", { token: "acme" })).toBe(
      `${APP_CONSTANTS.LEVER_JOB_URL}/acme`,
    );
  });

  it("uses the US Lever host when host is explicitly default", () => {
    expect(companyBoardUrl("lever", { token: "acme", host: "default" })).toBe(
      `${APP_CONSTANTS.LEVER_JOB_URL}/acme`,
    );
  });

  it("uses the EU Lever host when host is eu", () => {
    expect(companyBoardUrl("lever", { token: "acme", host: "eu" })).toBe(
      `${APP_CONSTANTS.LEVER_EU_JOB_URL}/acme`,
    );
  });

  it("ignores host for Greenhouse boards", () => {
    expect(
      companyBoardUrl("greenhouse", { token: "acme", host: "eu" }),
    ).toBe(`${APP_CONSTANTS.GREENHOUSE_BOARD_URL}/acme`);
  });
});
