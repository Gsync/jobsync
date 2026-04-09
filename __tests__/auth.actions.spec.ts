import { signup, authenticate } from "@/actions/auth.actions";
import { signIn } from "@/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { JOB_SOURCES, JOB_STATUSES } from "@/lib/constants";
import { delay } from "@/utils/delay";
import { AuthError } from "next-auth";

// Mock dependencies
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    jobSource: {
      createMany: vi.fn(),
    },
    jobStatus: {
      upsert: vi.fn(),
    },
  };
  return { default: mockPrisma };
});

vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
  hash: vi.fn(),
}));

vi.mock("@/utils/delay", () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next-auth", () => {
  class MockAuthError extends Error {
    type: string;

    constructor(message: string) {
      super(message);
      this.name = "AuthError";
      this.type = message;
    }
  }

  return {
    AuthError: MockAuthError,
  };
});



describe("Auth Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signup", () => {
    const validSignupData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    };

    const mockNewUser = {
      id: "user-id",
      name: "John Doe",
      email: "john@example.com",
      password: "hashed_password_123",
    };

    it("should successfully create a new user", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      const result = await signup(validSignupData);

      expect(result).toEqual({ success: true });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validSignupData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(validSignupData.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: validSignupData.name,
          email: validSignupData.email,
          password: "hashed_password_123",
        },
      });
      expect(prisma.jobSource.createMany).toHaveBeenCalledWith({
        data: JOB_SOURCES.map((source) => ({
          label: source.label,
          value: source.value,
          createdBy: mockNewUser.id,
        })),
      });
    });

    it("should return error if user already exists", async () => {
      const existingUser = {
        id: "existing-user-id",
        email: validSignupData.email,
      };
      (prisma.user.findUnique as any).mockResolvedValue(existingUser);

      const result = await signup(validSignupData);

      expect(result).toEqual({
        error: "An account with this email already exists.",
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validSignupData.email },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return error when name is too short", async () => {
      const invalidData = {
        ...validSignupData,
        name: "A",
      };

      const result = await signup(invalidData);

      expect(result).toEqual({ error: "Invalid form data." });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return error when email is invalid", async () => {
      const invalidData = {
        ...validSignupData,
        email: "invalid-email",
      };

      const result = await signup(invalidData);

      expect(result).toEqual({ error: "Invalid form data." });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return error when email is too short", async () => {
      const invalidData = {
        ...validSignupData,
        email: "a@",
      };

      const result = await signup(invalidData);

      expect(result).toEqual({ error: "Invalid form data." });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return error when password is too short", async () => {
      const invalidData = {
        ...validSignupData,
        password: "short",
      };

      const result = await signup(invalidData);

      expect(result).toEqual({ error: "Invalid form data." });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should create job sources for new user", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      expect(prisma.jobSource.createMany).toHaveBeenCalledWith({
        data: JOB_SOURCES.map((source) => ({
          label: source.label,
          value: source.value,
          createdBy: mockNewUser.id,
        })),
      });
    });

    it("should create job sources with correct structure", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      const jobSourcesCall = (prisma.jobSource.createMany as any).mock
        .calls[0][0];
      expect(jobSourcesCall.data).toHaveLength(JOB_SOURCES.length);
      jobSourcesCall.data.forEach((source: any, index: number) => {
        expect(source).toEqual({
          label: JOB_SOURCES[index].label,
          value: JOB_SOURCES[index].value,
          createdBy: mockNewUser.id,
        });
      });
    });

    it("should include createdBy field in all job sources", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      const jobSourcesCall = (prisma.jobSource.createMany as any).mock
        .calls[0][0];
      jobSourcesCall.data.forEach((source: any) => {
        expect(source).toHaveProperty("createdBy");
        expect(source.createdBy).toBe(mockNewUser.id);
      });
    });

    it("should create job statuses for new user", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      expect(prisma.jobStatus.upsert).toHaveBeenCalledTimes(
        JOB_STATUSES.length,
      );
      JOB_STATUSES.forEach((status) => {
        expect(prisma.jobStatus.upsert).toHaveBeenCalledWith({
          where: { value: status.value },
          update: {},
          create: status,
        });
      });
    });

    it("should upsert all job statuses with correct data", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      JOB_STATUSES.forEach((status, index) => {
        const callArgs = (prisma.jobStatus.upsert as any).mock.calls[
          index
        ][0];
        expect(callArgs.where.value).toBe(status.value);
        expect(callArgs.update).toEqual({});
        expect(callArgs.create).toEqual(status);
      });
    });

    it("should create job sources before job statuses", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      const jobSourcesCallOrder = (prisma.jobSource.createMany as any)
        .mock.invocationCallOrder[0];
      const jobStatusCallOrder = (prisma.jobStatus.upsert as any).mock
        .invocationCallOrder[0];

      expect(jobSourcesCallOrder).toBeLessThan(jobStatusCallOrder);
    });

    it("should not create job sources if user creation fails", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockRejectedValue(
        new Error("Database error"),
      );

      await expect(signup(validSignupData)).rejects.toThrow("Database error");

      expect(prisma.jobSource.createMany).not.toHaveBeenCalled();
      expect(prisma.jobStatus.upsert).not.toHaveBeenCalled();
    });

    it("should handle job source creation error", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockRejectedValue(
        new Error("Failed to create job sources"),
      );

      await expect(signup(validSignupData)).rejects.toThrow(
        "Failed to create job sources",
      );

      expect(prisma.jobStatus.upsert).not.toHaveBeenCalled();
    });

    it("should handle job status creation error", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockRejectedValue(
        new Error("Failed to create job status"),
      );

      await expect(signup(validSignupData)).rejects.toThrow(
        "Failed to create job status",
      );
    });

    it("should hash password with correct salt rounds", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue("hashed_password_123");
      (prisma.user.create as any).mockResolvedValue(mockNewUser);
      (prisma.jobSource.createMany as any).mockResolvedValue(undefined);
      (prisma.jobStatus.upsert as any).mockResolvedValue(undefined);

      await signup(validSignupData);

      expect(bcrypt.hash).toHaveBeenCalledWith(validSignupData.password, 10);
    });

    it("should return error if email is missing", async () => {
      const invalidData = {
        name: "John Doe",
        email: "",
        password: "password123",
      };

      const result = await signup(invalidData);

      expect(result).toEqual({ error: "Invalid form data." });
    });

    it("should return error if password is missing", async () => {
      const invalidData = {
        name: "John Doe",
        email: "john@example.com",
        password: "",
      };

      const result = await signup(invalidData);

      expect(result).toEqual({ error: "Invalid form data." });
    });
  });

  describe("authenticate", () => {
    const mockFormData = new FormData();
    mockFormData.set("email", "john@example.com");
    mockFormData.set("password", "password123");

    it("should return null on successful authentication", async () => {
      (signIn as any).mockResolvedValue(undefined);

      const result = await authenticate("", mockFormData);

      expect(result).toBeNull();
      expect(delay).toHaveBeenCalledWith(1000);
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "john@example.com",
        password: "password123",
        redirect: false,
      });
    });

    it("should return error message on invalid credentials", async () => {
      const authError = new AuthError("CredentialsSignin");
      (signIn as any).mockRejectedValue(authError);

      const result = await authenticate("", mockFormData);

      expect(result).toEqual("Invalid credentials.");
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "john@example.com",
        password: "password123",
        redirect: false,
      });
    });

    it("should return generic error message on unknown error", async () => {
      const authError = new AuthError("UnknownError");
      (signIn as any).mockRejectedValue(authError);

      const result = await authenticate("", mockFormData);

      expect(result).toEqual("Something went wrong.");
    });

    it("should call delay before signing in", async () => {
      (signIn as any).mockResolvedValue(undefined);

      await authenticate("", mockFormData);

      expect(delay).toHaveBeenCalledWith(1000);
      expect(signIn).toHaveBeenCalled();
      const delayCallOrder = (delay as any).mock.invocationCallOrder[0];
      const signInCallOrder = (signIn as any).mock.invocationCallOrder[0];
      expect(delayCallOrder).toBeLessThan(signInCallOrder);
    });

    it("should rethrow non-AuthError exceptions", async () => {
      const error = new Error("Database error");
      (signIn as any).mockRejectedValue(error);

      try {
        await authenticate("", mockFormData);
        fail("Should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Database error");
      }
    });

    it("should extract form data correctly", async () => {
      (signIn as any).mockResolvedValue(undefined);
      const testFormData = new FormData();
      testFormData.set("email", "test@example.com");
      testFormData.set("password", "testpass123");

      await authenticate("", testFormData);

      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "testpass123",
        redirect: false,
      });
    });
  });
});
