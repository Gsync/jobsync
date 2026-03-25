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
  employmentType?: "full_time" | "part_time" | "contract";
  externalId?: string;
  /** ISO 8601 date string (e.g. "2026-03-15") from the job board; format varies by connector. */
  applicationDeadline?: string;
  /** Free-text application instructions, HTML-stripped. May contain multi-paragraph content from the source board. */
  applicationInstructions?: string;
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
