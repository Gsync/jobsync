import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const authHandler = NextAuth(authConfig).auth;

/**
 * Adds CORS headers for allowed dev origins in development mode.
 * Reads from process.env.ALLOWED_DEV_ORIGINS which is kept up-to-date
 * at runtime by the env-sync server action (no restart required).
 */
function addDevCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  if (process.env.NODE_ENV !== "development") return response;

  const origin = request.headers.get("origin");
  if (!origin) return response;

  const allowed =
    process.env.ALLOWED_DEV_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];

  const isAllowed = allowed.some(
    (o) => origin === o || origin.includes(o) || o.includes(origin)
  );

  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export default async function middleware(request: NextRequest) {
  // Run the NextAuth middleware
  const authResponse = await (authHandler as any)(request);
  const response = authResponse ?? NextResponse.next();

  // Add CORS headers for allowed dev origins
  return addDevCorsHeaders(request, response);
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    // "/((?!api|_next/static|_next/image|.*\\.png$).*)",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
