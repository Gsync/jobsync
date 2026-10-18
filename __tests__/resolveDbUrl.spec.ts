import { resolveDatabaseUrl } from "../scripts/wait/resolve";

const BUNDLED = "postgres://jobsync:b3und!ed@db:5432/jobsync";
const EXTERNAL = "postgres://me:pw@192.168.0.162:5432/jobsync";

describe("resolveDatabaseUrl", () => {
  it("keeps the url as found when BUNDLED_DATABASE_URL is absent", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "file:/data/dev.db" })).toEqual({
      url: "file:/data/dev.db",
      warning: null,
    });
  });

  it.each([undefined, "", "  "])("uses the bundled url when DATABASE_URL is %j", (raw) => {
    expect(resolveDatabaseUrl({ DATABASE_URL: raw, BUNDLED_DATABASE_URL: BUNDLED })).toEqual({
      url: BUNDLED,
      warning: null,
    });
  });

  it.each([undefined, "1"])("swaps a file: url for the bundled one when BUNDLED_DB is %j", (flag) => {
    const result = resolveDatabaseUrl({
      DATABASE_URL: "file:./dev.db",
      BUNDLED_DATABASE_URL: BUNDLED,
      BUNDLED_DB: flag,
    });
    expect(result.url).toBe(BUNDLED);
    expect(result.warning).toContain("Ignoring DATABASE_URL=file:./dev.db");
    expect(result.warning).toContain("You can delete that line from .env.");
    expect(result.warning).not.toContain("b3und!ed");
  });

  it("keeps a file: url when the bundled database is switched off", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "file:/data/dev.db",
        BUNDLED_DATABASE_URL: BUNDLED,
        BUNDLED_DB: "0",
      }),
    ).toEqual({ url: "file:/data/dev.db", warning: null });
  });

  it("keeps an external url", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: EXTERNAL, BUNDLED_DATABASE_URL: BUNDLED })).toEqual({
      url: EXTERNAL,
      warning: null,
    });
  });
});
