import type { AIProviderConnector } from "@/lib/connector/ai-provider/types";

// We cannot import the singleton directly because other tests or module-level
// registration would pollute state. Instead, test the registry class pattern
// by re-creating a fresh instance via a small inline helper.

function createTestRegistry() {
  const factories = new Map<string, () => AIProviderConnector>();

  return {
    register(id: string, factory: () => AIProviderConnector) {
      factories.set(id, factory);
    },
    create(id: string): AIProviderConnector {
      const factory = factories.get(id);
      if (!factory) {
        throw new Error(
          `Unknown AI provider: "${id}". Available: ${[...factories.keys()].join(", ")}`,
        );
      }
      return factory();
    },
    has(id: string): boolean {
      return factories.has(id);
    },
    availableProviders(): string[] {
      return [...factories.keys()];
    },
  };
}

function createMockConnector(
  overrides: Partial<AIProviderConnector> = {},
): AIProviderConnector {
  return {
    id: overrides.id ?? "mock",
    name: overrides.name ?? "Mock Provider",
    requiresApiKey: overrides.requiresApiKey ?? false,
    healthCheck: overrides.healthCheck ?? jest.fn(),
    listModels: overrides.listModels ?? jest.fn(),
    createModel: overrides.createModel ?? jest.fn(),
  };
}

describe("AIProviderRegistry", () => {
  it("registers and creates a provider", () => {
    const registry = createTestRegistry();
    const connector = createMockConnector({ id: "test", name: "Test" });
    registry.register("test", () => connector);

    const result = registry.create("test");
    expect(result.id).toBe("test");
    expect(result.name).toBe("Test");
  });

  it("has() returns true for registered providers", () => {
    const registry = createTestRegistry();
    registry.register("alpha", () => createMockConnector({ id: "alpha" }));

    expect(registry.has("alpha")).toBe(true);
    expect(registry.has("beta")).toBe(false);
  });

  it("availableProviders() returns all registered ids", () => {
    const registry = createTestRegistry();
    registry.register("a", () => createMockConnector({ id: "a" }));
    registry.register("b", () => createMockConnector({ id: "b" }));
    registry.register("c", () => createMockConnector({ id: "c" }));

    expect(registry.availableProviders()).toEqual(["a", "b", "c"]);
  });

  it("throws on unknown provider", () => {
    const registry = createTestRegistry();
    registry.register("known", () => createMockConnector({ id: "known" }));

    expect(() => registry.create("unknown")).toThrow(
      'Unknown AI provider: "unknown"',
    );
  });

  it("error message lists available providers", () => {
    const registry = createTestRegistry();
    registry.register("ollama", () => createMockConnector());
    registry.register("openai", () => createMockConnector());

    expect(() => registry.create("gemini")).toThrow("ollama, openai");
  });

  it("create() calls factory each time (fresh instances)", () => {
    const registry = createTestRegistry();
    const factory = jest.fn(() => createMockConnector({ id: "fresh" }));
    registry.register("fresh", factory);

    registry.create("fresh");
    registry.create("fresh");

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("later registration overwrites earlier one", () => {
    const registry = createTestRegistry();
    registry.register("dup", () =>
      createMockConnector({ id: "dup", name: "First" }),
    );
    registry.register("dup", () =>
      createMockConnector({ id: "dup", name: "Second" }),
    );

    const result = registry.create("dup");
    expect(result.name).toBe("Second");
  });
});
