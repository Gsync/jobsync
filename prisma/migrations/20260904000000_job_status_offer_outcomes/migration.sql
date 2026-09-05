-- Data-only: JobStatus rows are seeded at signup, so existing databases
-- need the two new statuses inserted.
INSERT OR IGNORE INTO "JobStatus" ("id", "label", "value") VALUES
  ('ed067643-9887-467d-b870-a5bad64de662', 'Offer Accepted', 'offer-accepted'),
  ('ef09b767-29bb-4800-8713-daebe4600b41', 'Offer Declined', 'offer-declined');
