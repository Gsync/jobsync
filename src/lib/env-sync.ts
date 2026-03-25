"use server";

import fs from "fs/promises";
import path from "path";

/**
 * Updates a single key in the .env file.
 * If the key exists, updates its value. If not, appends it.
 * If value is empty/undefined, removes the key entirely.
 *
 * Also updates process.env at runtime so the change is effective
 * immediately without a server restart.
 */
export async function syncEnvVariable(
  key: string,
  value: string | undefined
): Promise<{ success: boolean }> {
  try {
    const envPath = path.join(process.cwd(), ".env");
    let content = "";
    try {
      content = await fs.readFile(envPath, "utf-8");
    } catch {
      // .env doesn't exist yet — will be created
    }

    const lines = content.split("\n");
    const keyPattern = new RegExp(`^${key}=`);
    const existingIndex = lines.findIndex((line) => keyPattern.test(line));

    if (value) {
      const newLine = `${key}=${value}`;
      if (existingIndex >= 0) {
        lines[existingIndex] = newLine;
      } else {
        lines.push(newLine);
      }
      // Also update process.env for current runtime
      process.env[key] = value;
    } else {
      // Remove the key
      if (existingIndex >= 0) {
        lines.splice(existingIndex, 1);
      }
      delete process.env[key];
    }

    await fs.writeFile(envPath, lines.join("\n"));
    return { success: true };
  } catch {
    return { success: false };
  }
}
