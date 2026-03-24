import { connectorRegistry } from "./registry";
import { createJSearchConnector } from "./jsearch";
import { createEuresConnector } from "./eures";
import { createArbeitsagenturConnector } from "./arbeitsagentur";

// Register all available data source connectors
connectorRegistry.register("jsearch", createJSearchConnector);
connectorRegistry.register("eures", createEuresConnector);
connectorRegistry.register("arbeitsagentur", createArbeitsagenturConnector);

export { connectorRegistry };
