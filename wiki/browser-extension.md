---
type: how-to
title: Browser Extension
description: Saving the job posting you are viewing to your own JobSync with the browser extension — connecting it with an access token, duplicate saves, and fixing a failed connection test.
feature: api
tags: [browser extension, chrome, save job, side panel, access token, connection test, duplicate, integration]
aliases: [chrome extension, jobsync extension, save posting, clip job, browser add-on]
status: draft
stale_after: 2027-11-15
---

# Browser Extension

The browser extension is not on the Chrome Web Store yet. This page describes how it works once it is released.

## What does the browser extension do?

It saves the job posting you are looking at to your own JobSync in one click. Click the extension's toolbar icon on a job page and a side panel opens with a form filled in from the page: title, company, location, workplace type, salary, job URL, status and description. Check the fields, click **Save**, and the panel gives you an **Open in JobSync** link to the new job.

The panel stays open while you move to the next posting, so you can go through several in a row. If you select text on the page before clicking the icon, that selection becomes the description.

The extension talks only to your own JobSync address and reads a page only when you click its icon. Jobs it saves show "via Browser extension" in JobSync.

## How do I connect the browser extension to JobSync?

Generate an access token in JobSync, then paste your JobSync address and the token into the extension's options page. To get the token, open the avatar menu at the bottom of the sidebar, choose **Settings**, then **Access Tokens**, and click **Generate**. Name it "Browser extension" and copy it before you close the dialog — it is shown only once.

The options page opens by itself after you install the extension. Enter the address you open JobSync at, such as `http://192.168.x.x:3737`, without a path, and paste the token. Click **Test connection**. Chrome asks for permission to reach that address; allow it. A working connection shows your JobSync version, the token's name and its expiry date.

When the token is within 14 days of expiring, the side panel warns you. Generate a new token and paste it into the options page before then.

## Why does saving a job say it is already saved?

JobSync found a job that matches the one you are saving, either with the same job URL or the same company and title. The panel shows "You already saved *Title* at *Company*" with two buttons: **Open** takes you to the existing job, and **Save anyway** adds this one as a separate job.

Use **Save anyway** when it really is a different job, such as the same title at the same company in another city.

## What do I do when the connection test fails?

Read the message the test shows, because each one has a different fix:

- **Can't reach JobSync at that address.** Check that JobSync is running and that this computer can reach it. Check whether the address starts with `http://` or `https://`; an address typed without one is tried as `https://`. If JobSync uses a self-signed certificate, this computer must trust it first.
- **The token is invalid or has expired.** Generate a new token in JobSync and paste it in. A revoked token fails the same way.
- **This token can't add jobs.** The token lacks the `jobs:write` scope. Generate a new one.
- **Your JobSync is too old for the extension.** Your JobSync sent the test to its sign-in page, which means it predates the API. Update JobSync and test again.
- **That address doesn't look like JobSync.** Enter the address you open JobSync at, without a path such as `/dashboard`.
- **The extension needs permission to reach your JobSync address.** You declined Chrome's prompt. Test again and allow it.
