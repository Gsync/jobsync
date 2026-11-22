---
type: how-to
title: JobSync API
description: Adding jobs to JobSync from your own scripts over HTTP — authenticating with an access token, the request fields and responses, the via label, and the rate limit.
feature: api
tags: [api, rest api, access token, add job, script, curl, http, integration, via, rate limit]
aliases: [public api, rest api, http api, api v1, add job api, jobs endpoint, webhook]
status: stable
stale_after: 2027-11-15
---

# JobSync API

## What can the JobSync API do?

It can test a connection and add a job, and nothing else in this first version. `GET /api/v1/ping` confirms that an address is a JobSync instance and that your token works; `POST /api/v1/jobs` adds a job to your tracker. The browser extension uses the same two calls.

Jobs added through the API go through the same steps as jobs added in AI chat or over MCP: the company, title, location and source resolve against your existing lists, and a posting you already saved is reported as a duplicate instead of being added twice.

The API does not need `MCP_ENABLED`. That setting turns on the MCP server only; the API is always available to anyone holding one of your access tokens.

## How do I authenticate with the API?

Send one of your access tokens in an `Authorization: Bearer <token>` header on every request. Generate the token from the avatar menu at the bottom of the sidebar: choose **Settings**, then **Access Tokens**, and click **Generate**. The full token is shown once, so copy it before closing the dialog.

To check a token, call the ping endpoint:

```bash
curl -i http://localhost:3737/api/v1/ping -H "Authorization: Bearer <token>"
```

A working token returns `200` with `"app": "jobsync"`, the JobSync version, the token's name, its expiry date (`tokenExpiresAt`) and its scopes. A token without the `jobs:write` scope gets `403`.

Tokens expire after 30, 90 or 365 days, whichever you picked. A script or automation stops working the day its token expires, so note the expiry date when you generate one and replace the token before then.

## How do I add a job through the API?

Send a `POST` to `/api/v1/jobs` with a JSON body. Only `company` and `jobTitle` are required:

| Field | Notes |
|---|---|
| `company`, `jobTitle` | Required, up to 200 characters |
| `jobDescription` | Markdown, up to 50,000 characters |
| `jobUrl` | An `http` or `https` URL; used to spot duplicates |
| `location`, `source` | Up to 200 characters; `source` is the job board, such as LinkedIn |
| `jobType` | `Full-time` (default), `Part-time` or `Contract` |
| `workplaceType` | `Remote`, `Hybrid` or `Onsite` |
| `salaryRange` | Free text |
| `status` | A status such as `draft` (default), `applied` or `interview` |
| `allowDuplicate` | `true` to save even if the job looks already saved |
| `via` | The label shown on the job, up to 50 characters |

```bash
curl -i http://localhost:3737/api/v1/jobs -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"company":"Acme","jobTitle":"API Test Engineer","jobUrl":"https://example.com/jobs/1","via":"curl"}'
```

Values are trimmed, and a blank optional field counts as left out. The response status tells you what happened:

| Status | Meaning |
|---|---|
| `201` | Saved; the body has `jobId` and `jobPath` |
| `409` | Already saved; `duplicateOf` names the existing job |
| `400` | A field is invalid; `issues` names it |
| `401` | The token is missing, wrong or expired |
| `403` | The token lacks the `jobs:write` scope |
| `429` | Rate limit reached |
| `500` | Something else failed; try again |

`jobPath` is a path such as `/dashboard/myjobs/<id>`. Join it to your own JobSync address to open the job.

## How do I set the via label on a job?

Send a `via` field of up to 50 characters, and the job shows it as a "via …" badge. Use it to name what added the job, such as `My scraper`. Leave it out and the badge shows the name of the token that made the request.

`via` is not the **Source** field. Source is the job board or site the posting came from, and you set it with `source`.

## How do I call the API from my own script?

Use any HTTP client that can send a `POST` with a JSON body. Send the body with a `Content-Type: application/json` header and your `Authorization: Bearer <token>` header to `<your JobSync address>/api/v1/jobs`, exactly as the `curl` example above does.

Branch on the response status code, not on the error text. The status codes are part of the API's contract; the wording of error messages can change.

The script must be able to reach your JobSync instance. A JobSync running on your home network is not reachable from a service on the internet unless you have exposed it yourself.

## What is the API rate limit?

It is 100 requests an hour, shared with MCP across all your tokens. Every request to `/api/v1/jobs` with a valid token that has the `jobs:write` scope counts, including ones rejected as invalid or duplicate; the ping endpoint does not count. Over the limit, the API answers `429` with a `Retry-After` header giving the seconds until you can try again.
