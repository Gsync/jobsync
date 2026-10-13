-- The JSearch job board was removed, and RapidAPI keys existed only to power
-- it. The settings UI no longer lists the provider, so these rows would be
-- unreachable orphans; drop them.
DELETE FROM "ApiKey" WHERE "provider" = 'rapidapi';
