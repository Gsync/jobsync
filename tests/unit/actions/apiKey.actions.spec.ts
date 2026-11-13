import {
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
  getOllamaBaseUrl,
} from "@/actions/apiKey.actions";
import db from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";

vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/db", () => ({
  default: {
    apiKey: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

describe("apiKey actions — unauthenticated path", () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockResolvedValue(null);
  });

  it("getUserApiKeys returns the Not authenticated envelope", async () => {
    const result = await getUserApiKeys();
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });

  it("saveApiKey returns the Not authenticated envelope", async () => {
    const result = await saveApiKey({ provider: "openai", key: "sk-x" });
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });

  it("deleteApiKey returns the Not authenticated envelope", async () => {
    const result = await deleteApiKey("openai");
    expect(result).toEqual({ success: false, message: "Not authenticated" });
  });
});

describe("getOllamaBaseUrl — ignores a client-supplied user id", () => {
  // A browser can send any arguments to a server action over the wire.
  const callWithUserId = getOllamaBaseUrl as (userId?: string) => Promise<string>;
  const mockedFindUnique = vi.mocked(db.apiKey.findUnique);

  beforeEach(() => {
    mockedFindUnique.mockImplementation((async ({ where }: any) => ({
      encryptedKey: `http://${where.userId_provider.userId}:11434`,
      iv: "",
    })) as any);
  });

  it("reads the session user's URL, not the passed user's", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user-a" } as any);

    const result = await callWithUserId("user-b");

    expect(result).toBe("http://user-a:11434");
  });

  it("returns the default without a session, even with a passed id", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const result = await callWithUserId("user-b");

    expect(result).not.toBe("http://user-b:11434");
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });
});
