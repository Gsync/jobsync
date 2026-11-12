// @vitest-environment node
const { PrismaPg, PrismaClient } = vi.hoisted(() => ({
  PrismaPg: vi.fn(function () {}),
  PrismaClient: vi.fn(function () {}),
}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient }));
import { createPrismaClient } from "@/lib/db";

const POOL = { connectionTimeoutMillis: 5_000, idleTimeoutMillis: 300_000 };

it("passes ?schema= to the adapter as its schema option", () => {
  const url = "postgres://u:p@h:5432/db?schema=my-schema";
  createPrismaClient(url);
  expect(PrismaPg).toHaveBeenLastCalledWith({ connectionString: url, ...POOL }, { schema: "my-schema" });
  expect(PrismaClient).toHaveBeenLastCalledWith({ adapter: PrismaPg.mock.instances.at(-1) });
});

it("passes no schema option without ?schema=", () => {
  createPrismaClient("postgres://u:p@h/db");
  expect(PrismaPg).toHaveBeenLastCalledWith({ connectionString: "postgres://u:p@h/db", ...POOL }, undefined);
});

it.each([undefined, "not a url"])("builds a client from %j without throwing", (url) => {
  expect(() => createPrismaClient(url)).not.toThrow();
});
