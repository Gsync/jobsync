import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const proxy = NextAuth(authConfig).auth;

export const config = {
  // https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/api/((?!auth|mcp).*)",
  ],
};
