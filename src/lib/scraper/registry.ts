import type { DataSourceConnector } from "./types";

type ConnectorFactory = () => DataSourceConnector;

class ConnectorRegistry {
  private factories = new Map<string, ConnectorFactory>();

  register(id: string, factory: ConnectorFactory): void {
    this.factories.set(id, factory);
  }

  create(id: string): DataSourceConnector {
    const factory = this.factories.get(id);
    if (!factory) {
      throw new Error(`Unknown connector: "${id}". Available: ${[...this.factories.keys()].join(", ")}`);
    }
    return factory();
  }

  has(id: string): boolean {
    return this.factories.has(id);
  }

  availableConnectors(): string[] {
    return [...this.factories.keys()];
  }
}

export const connectorRegistry = new ConnectorRegistry();
