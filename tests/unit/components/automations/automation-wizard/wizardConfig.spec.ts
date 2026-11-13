import { parseEditSourceConfig } from "@/components/automations/automation-wizard/wizardConfig";
import { PROVIDER_META } from "@/components/automations/ats-search-step/types";

describe("parseEditSourceConfig", () => {
  it("returns undefined for null/blank input", () => {
    expect(parseEditSourceConfig(null)).toBeUndefined();
    expect(parseEditSourceConfig("")).toBeUndefined();
  });

  it("returns undefined for malformed JSON", () => {
    expect(parseEditSourceConfig("{not json")).toBeUndefined();
  });

  it("keeps a Greenhouse config", () => {
    const sc = JSON.stringify({ greenhouse: { companies: [] } });
    expect(parseEditSourceConfig(sc)).toEqual({ greenhouse: { companies: [] } });
  });

  it("keeps a Lever config", () => {
    const sc = JSON.stringify({ lever: { companies: [] } });
    expect(parseEditSourceConfig(sc)).toEqual({ lever: { companies: [] } });
  });

  it("keeps an Ashby config so editing an Ashby automation keeps its companies", () => {
    const sc = JSON.stringify({
      ashby: { companies: [{ name: "Ramp", token: "ramp" }] },
    });
    expect(parseEditSourceConfig(sc)).toEqual({
      ashby: { companies: [{ name: "Ramp", token: "ramp" }] },
    });
  });
});

describe("PROVIDER_META", () => {
  it("has an entry for every board the wizard can select", () => {
    ["greenhouse", "lever", "ashby"].forEach((board) => {
      expect(PROVIDER_META[board]).toBeDefined();
      expect(PROVIDER_META[board].label.length).toBeGreaterThan(0);
    });
  });
});
