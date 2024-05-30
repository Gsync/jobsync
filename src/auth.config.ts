import type { NextAuthConfig } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: any;
  }
}

export const authConfig = {
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token;
      return session;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
