import { vi } from "vitest";

const mockAuth = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockHandlers = { GET: vi.fn(), POST: vi.fn() };

const NextAuth = vi.fn(() => ({
  auth: mockAuth,
  handlers: mockHandlers,
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

export default NextAuth;
export const auth = mockAuth;
export const signIn = mockSignIn;
export const signOut = mockSignOut;
export const handlers = mockHandlers;
