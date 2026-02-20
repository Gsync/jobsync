// Canonical domain type: what "a job discovered by automation" means in JobSync
export interface DiscoveredVacancy {
  title: string;
  employerName: string;
  location: string;
  description: string;
  sourceUrl: string;
  sourceBoard: string;
  postedAt?: Date;
  salary?: string;
  employmentType?: string;
  externalId?: string;
}

export type ConnectorError =
  | { type: "blocked"; reason: string }
  | { type: "rate_limited"; retryAfter?: number }
  | { type: "network"; message: string }
  | { type: "parse"; message: string };

export type ConnectorResult<T> =
  | { success: true; data: T }
  | { success: false; error: ConnectorError };

export interface SearchParams {
  keywords: string;
  location: string;
  connectorParams?: Record<string, unknown>;
}

export interface DataSourceConnector {
  readonly id: string;
  readonly name: string;
  readonly requiresApiKey: boolean;
  search(params: SearchParams): Promise<ConnectorResult<DiscoveredVacancy[]>>;
  getDetails?(externalId: string): Promise<ConnectorResult<DiscoveredVacancy>>;
}
