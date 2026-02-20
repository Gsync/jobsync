import { connectorRegistry } from "./registry";
import { createJSearchConnector } from "./jsearch";

// Register all available data source connectors
connectorRegistry.register("jsearch", createJSearchConnector);

export { connectorRegistry };
