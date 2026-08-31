import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { APP_CONSTANTS } from "@/lib/constants";
import { isNewerVersion } from "@/lib/version";
import { AppVersionInfo } from "@/models/version.model";
import packageJson from "../../../../package.json";
import { log } from "@/lib/telemetry";

const RELEASE_URL = `https://api.github.com/repos/${APP_CONSTANTS.GITHUB_REPO}/releases/latest`;

// A self-hosted instance can be offline or rate-limited; that is not an error
// worth surfacing, so every failure degrades to "no update available".
async function fetchLatestRelease() {
  const res = await fetch(RELEASE_URL, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: APP_CONSTANTS.UPDATE_CHECK_REVALIDATE_SECONDS },
  });
  if (!res.ok) return null;

  const data = await res.json();
  return typeof data?.tag_name === "string"
    ? { tag: data.tag_name as string, url: data.html_url as string }
    : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const current = packageJson.version;
  let release: Awaited<ReturnType<typeof fetchLatestRelease>> = null;

  try {
    release = await fetchLatestRelease();
  } catch (error) {
    log.error("[Version] Update check failed", { error: String(error) });
  }

  const updateAvailable = release
    ? isNewerVersion(release.tag, current)
    : false;

  const info: AppVersionInfo = {
    current,
    latest: release?.tag ?? null,
    updateAvailable,
    releaseUrl: updateAvailable ? (release?.url ?? null) : null,
  };

  return NextResponse.json(info, { status: 200 });
}
