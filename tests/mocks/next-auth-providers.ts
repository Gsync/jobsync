import { vi } from "vitest";

const Credentials = vi.fn((config: any) => ({
  id: "credentials",
  name: "Credentials",
  type: "credentials",
  credentials: config?.credentials || {},
  authorize: config?.authorize || vi.fn(),
}));

export default Credentials;
