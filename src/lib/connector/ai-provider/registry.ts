import type { AIProviderConnector } from "./types";

type AIProviderFactory = () => AIProviderConnector;

class AIProviderRegistry {
  private factories = new Map<string, AIProviderFactory>();

  register(id: string, factory: AIProviderFactory): void {
    this.factories.set(id, factory);
  }

  create(id: string): AIProviderConnector {
    const factory = this.factories.get(id);
    if (!factory) {
      throw new Error(
        `Unknown AI provider: "${id}". Available: ${[...this.factories.keys()].join(", ")}`,
      );
    }
    return factory();
  }

  has(id: string): boolean {
    return this.factories.has(id);
  }

  availableProviders(): string[] {
    return [...this.factories.keys()];
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
