import { connectorRegistry } from "./registry";
import { createJSearchConnector } from "./modules/jsearch";
import { createEuresConnector } from "./modules/eures";
import { createArbeitsagenturConnector } from "./modules/arbeitsagentur";

// Register all available data source connectors
connectorRegistry.register("jsearch", createJSearchConnector);
connectorRegistry.register("eures", createEuresConnector);
connectorRegistry.register("arbeitsagentur", createArbeitsagenturConnector);

export { connectorRegistry };
