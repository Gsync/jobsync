export type ApiV1ErrorResponse = { error: string };

export type ApiV1PingResponse = {
  app: "jobsync";
  version: string;
  tokenName: string;
  tokenExpiresAt: string;
  scopes: string[];
};
