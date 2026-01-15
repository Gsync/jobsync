const mockAuth = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockHandlers = { GET: jest.fn(), POST: jest.fn() };

const NextAuth = jest.fn(() => ({
  auth: mockAuth,
  handlers: mockHandlers,
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

// Export both default and named exports
export default NextAuth;
export const auth = mockAuth;
export const signIn = mockSignIn;
export const signOut = mockSignOut;
export const handlers = mockHandlers;
