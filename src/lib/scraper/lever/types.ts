export interface LeverPosting {
  id: string;
  text: string; // title
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number; // epoch ms
  workplaceType?: string; // "remote" | "hybrid" | "on-site" — mapped to REMOTE/HYBRID/ONSITE
  categories?: {
    commitment?: string; // employment type
    team?: string;
    department?: string;
    location?: string;
    allLocations?: string[];
  };
  descriptionPlain?: string;
  openingPlain?: string;
  additionalPlain?: string;
  // Body sections (responsibilities/requirements) — HTML, and present in none
  // of the plain fields, so they must be flattened and appended (see mapper).
  lists?: { text?: string; content?: string }[];
}

export type LeverHost = "default" | "eu";

export interface LeverCompany {
  name: string;
  token: string;
  host?: LeverHost; // resolved once at add-time/seed-build-time; defaults to "default" when absent
}
