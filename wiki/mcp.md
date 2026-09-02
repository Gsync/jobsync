---
type: how-to
title: MCP Access
description: Connecting an external AI agent such as Claude Desktop to JobSync over MCP — generating a token, adding the connector, the tools an agent gets, and the limits.
feature: mcp
tags: [mcp, claude desktop, agent, connector, personal access token, integration, add job from chat, mcp-remote, streamable-http, token, revoke]
aliases: [model context protocol, connect claude, claude desktop integration, api token, personal access token, agent access, external agent]
status: stable
stale_after: 2027-09-02
---

# MCP Access

## What can an AI agent do with JobSync over MCP?

It can add and correct jobs, add Question Bank entries, and save a job-match or resume review that it produced itself. JobSync runs a built-in MCP (Model Context Protocol) server, so a chat client such as Claude Desktop can write to your tracker without you switching to the app — paste a posting into your agent and ask it to add the job, and the company, title, location, source and tags resolve against your existing lists.

Two things stay in your control. Every connection needs a personal access token you generate yourself, and each token is named — jobs it creates carry that name as their source, and an agent can only edit jobs that were created through MCP in the first place. Nothing an agent does can overwrite a job you curated in the app.

JobSync runs no AI model on the MCP path. When the agent produces a match score or a resume review, it is the agent's own model doing the thinking; JobSync only hands over the material and stores the result.

## How do I generate an MCP access token?

Open the avatar menu at the bottom of the sidebar, choose **Settings**, then **MCP Access**, and click **Generate**. Name the token after the client you are connecting — "Claude Desktop", "Hermes" — because that name is what appears as the source on every job the token creates. Pick an expiry of 30, 90 or 365 days; 90 is the default.

The dialog that follows shows the full token once and never again. Copy it before you close the dialog, along with the ready-made config snippet for your client. If you lose it, revoke the token and generate a new one.

The same page shows your **Endpoint URL** at the top — it is your JobSync address with `/api/mcp` on the end — and lists every token you have, with its prefix, creation and expiry dates, last use and scopes. You can hold up to 10 tokens at a time.

## How do I add the connector to Claude Desktop?

Open Claude Desktop, go to **Settings → Developer → Edit Config** to open `claude_desktop_config.json`, and paste in the "Claude Desktop (via mcp-remote)" snippet from JobSync's token dialog. It looks like this:

```json
{
  "mcpServers": {
    "jobsync": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://<your-jobsync-url>/api/mcp",
        "--header",
        "Authorization: Bearer <your-token>"
      ]
    }
  }
}
```

Save the file and restart Claude Desktop fully — quit the app, don't just close the window. The JobSync tools then appear in the client's tool list.

`mcp-remote` is needed because Claude Desktop connects only to local servers; it bridges to JobSync's remote endpoint. If your JobSync URL is a plain `http://` address on your home network rather than `localhost` or HTTPS, `mcp-remote` refuses it unless you add `--allow-http` to the `args` list — the snippet in the token dialog already includes that flag when it detects such a URL.

## How do I connect a client other than Claude Desktop?

Use the streamable-HTTP snippet instead — clients such as OpenClaw and Hermes speak that transport natively and need no bridge:

```json
{
  "mcpServers": {
    "jobsync": {
      "type": "streamable-http",
      "url": "http://<your-jobsync-url>/api/mcp",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}
```

Both snippets are shown in the token dialog with your real URL and token already filled in, so copying from there is safer than typing this out.

## Which tools does a connected agent get?

Nine, all of them writes to your own data:

- **add_job** — adds a job, resolving or creating company, title, location, source and tags by name, and reporting back what it matched versus created.
- **add_jobs_batch** — the same thing for up to 10 jobs in one call, for a scheduled run.
- **find_job** — checks by URL whether a posting is already saved, before adding it again.
- **update_job** — corrects or enriches a job that was added through MCP. Only the fields supplied change.
- **add_question** — adds an entry to your Question Bank, with tags resolved the same way.
- **review_resume** / **save_resume_review** — hands the agent your default resume and reviewing instructions, then stores the review it writes.
- **save_match_result** / **save_match_results_batch** — stores a job-fit analysis the agent produced after adding a job.

Tokens are issued with the scopes needed for all of these, so there is nothing to configure per tool.

## How do I get a job match or resume review from my agent?

For a match, add a job through the agent with the full posting text and make sure you have a default resume set in **Profile**. JobSync then hands the agent your resume and asks it to analyze the fit; the score, recommendation and write-up land on the job and render exactly like an in-app match, labelled "mcp / \<token name\>".

How complete the description is decides what happens. A posting of roughly 150 words or more gets a full match. A shorter one still gets matched, but the score is flagged **Provisional** on the job. A title-only entry gets no match offer at all — the agent is told to fetch the full posting and update the job first.

For a resume review, ask your agent to review your resume. It reviews your **default** resume only, and needs one with enough content to work from; the result appears on that resume in the app.

Both are two-step flows, so a match or review is saved only if your agent completes the second call. If it stops after the first, the job or resume simply has no result attached — nothing is half-written.

## Why is my agent not connecting or not seeing the tools?

Work through these in order. Check that the endpoint URL in your config matches the one shown on the **MCP Access** page, including `/api/mcp`. Check that the token has not expired or been revoked — the tokens list shows expiry, and a revoked token stops working immediately. Restart the client fully after editing its config; most clients read it only at startup.

If the connection works but calls start failing, you may have hit the rate limit: 60 MCP requests per hour across all tools and all your tokens. A batch call spends one request per item, and adding a job then saving its match spends two.

If you self-host with `NODE_ENV=production`, the MCP server is off unless the environment variable `MCP_ENABLED` is set to `true`. That and every other setting are covered in the [project README](https://github.com/Gsync/jobsync#readme).

## How do I revoke a token or see which agent added a job?

Click the trash icon next to a token on **Settings → MCP Access** and confirm. Any agent using it loses access straight away, and this cannot be undone — the client will need a new token pasted into its config.

Revoking does not delete anything the token created. Jobs it added stay in your tracker with that token's name recorded as their source, which is how you tell an agent-added job from one you entered yourself. Editing such a job in the app is normal in every way.

Because MCP writes are scoped to jobs created through MCP, a revoked or replaced token never leaves an agent able to touch the rest of your data. Add a job by hand and no agent can rewrite it, whatever token it holds.
