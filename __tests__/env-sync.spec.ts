import fs from "fs/promises";
import path from "path";
import { syncEnvVariable } from "@/lib/env-sync";

// Spy on the actual fs/promises methods
const readFileSpy = jest.spyOn(fs, "readFile");
const writeFileSpy = jest.spyOn(fs, "writeFile");

describe("syncEnvVariable", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore process.env to original state
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it("writes a new key when .env exists without it", async () => {
    readFileSpy.mockResolvedValue("EXISTING_KEY=value1\nOTHER_KEY=value2" as any);
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable("NEW_KEY", "new_value");

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "EXISTING_KEY=value1\nOTHER_KEY=value2\nNEW_KEY=new_value"
    );
    expect(process.env.NEW_KEY).toBe("new_value");
  });

  it("updates an existing key", async () => {
    readFileSpy.mockResolvedValue(
      "SOME_KEY=old_value\nALLOWED_DEV_ORIGINS=http://old:3000" as any
    );
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable(
      "ALLOWED_DEV_ORIGINS",
      "http://new:3737"
    );

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "SOME_KEY=old_value\nALLOWED_DEV_ORIGINS=http://new:3737"
    );
    expect(process.env.ALLOWED_DEV_ORIGINS).toBe("http://new:3737");
  });

  it("removes a key when value is undefined", async () => {
    readFileSpy.mockResolvedValue(
      "KEEP_ME=yes\nREMOVE_ME=bye\nALSO_KEEP=true" as any
    );
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable("REMOVE_ME", undefined);

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "KEEP_ME=yes\nALSO_KEEP=true"
    );
    expect(process.env.REMOVE_ME).toBeUndefined();
  });

  it("removes a key when value is empty string", async () => {
    process.env.TO_REMOVE = "something";
    readFileSpy.mockResolvedValue("TO_REMOVE=something\nOTHER=val" as any);
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable("TO_REMOVE", "");

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "OTHER=val"
    );
    expect(process.env.TO_REMOVE).toBeUndefined();
  });

  it("creates .env when it does not exist", async () => {
    readFileSpy.mockRejectedValue(new Error("ENOENT: no such file"));
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable("BRAND_NEW", "fresh_value");

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "\nBRAND_NEW=fresh_value"
    );
    expect(process.env.BRAND_NEW).toBe("fresh_value");
  });

  it("handles write errors gracefully", async () => {
    readFileSpy.mockResolvedValue("KEY=val" as any);
    writeFileSpy.mockRejectedValue(new Error("Permission denied"));

    const result = await syncEnvVariable("KEY", "new_val");

    expect(result).toEqual({ success: false });
  });

  it("does not modify other keys when updating one", async () => {
    readFileSpy.mockResolvedValue("FIRST=1\nSECOND=2\nTHIRD=3" as any);
    writeFileSpy.mockResolvedValue(undefined as any);

    await syncEnvVariable("SECOND", "updated");

    const writtenContent = writeFileSpy.mock.calls[0][1] as string;
    expect(writtenContent).toContain("FIRST=1");
    expect(writtenContent).toContain("SECOND=updated");
    expect(writtenContent).toContain("THIRD=3");
  });

  it("handles removing a key that does not exist in .env", async () => {
    readFileSpy.mockResolvedValue("EXISTING=value" as any);
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable("NONEXISTENT", undefined);

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "EXISTING=value"
    );
  });

  it("handles values with special characters", async () => {
    readFileSpy.mockResolvedValue("" as any);
    writeFileSpy.mockResolvedValue(undefined as any);

    const result = await syncEnvVariable(
      "ALLOWED_DEV_ORIGINS",
      "http://192.168.1.100:3737, http://myhost.ts.net:3737"
    );

    expect(result).toEqual({ success: true });
    expect(writeFileSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), ".env"),
      "\nALLOWED_DEV_ORIGINS=http://192.168.1.100:3737, http://myhost.ts.net:3737"
    );
  });
});
