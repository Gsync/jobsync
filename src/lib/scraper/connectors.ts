import { connectorRegistry } from "./registry";
import { createJSearchConnector } from "./jsearch";
import { createEuresConnector } from "./eures";

// Register all available data source connectors
connectorRegistry.register("jsearch", createJSearchConnector);
connectorRegistry.register("eures", createEuresConnector);

export { connectorRegistry };
