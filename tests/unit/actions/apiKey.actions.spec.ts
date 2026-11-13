import {
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
} from "@/actions/apiKey.actions";
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
