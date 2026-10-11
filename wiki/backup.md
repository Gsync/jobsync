---
type: how-to
title: Data Backup
description: Exporting everything on your account as one zip, importing it back on any JobSync instance, what a backup leaves out, and undoing an import.
feature: backup
tags: [backup, restore, export, import, data, zip, snapshot, undo import, rollback, migrate, settings data]
aliases: [export my data, import my data, back up jobsync, restore from backup, move to a new server, undo import]
status: stable
stale_after: 2027-10-10
---

# Data Backup

## How do I back up my data?

Open the avatar menu at the bottom of the sidebar, choose **Settings**, then **Data**, and click **Download backup**. You get one zip with every job, resume, task, activity, contact and question on your account, plus your uploaded resume files.

## What does a backup leave out?

API keys, MCP tokens and your password. The file is safe to store anywhere for that reason, but it does contain the full text of every job description, note and resume, so keep it somewhere private.

## How do I restore a backup?

Under **Settings → Data**, choose the zip in **Import a backup**. JobSync reads it and shows when it was exported, which JobSync version and account it came from, and how many of each record it holds. Click **Replace my data with this backup** to confirm.

An import replaces everything on the account you are signed in to. Your API keys and MCP tokens are left alone, and the agent chat history is cleared. If the backup came from a different account, a red warning says so, and the import still wipes the account you are signed in to.

## How do I move JobSync to a new server?

Download a backup on the old instance, sign in to the new one, and import the zip under **Settings → Data**. Set your API keys again on the new instance, since a backup never carries them.

## How do I undo an import?

Every import saves your previous data first, and the **Undo an import** card under **Settings → Data** lists those snapshots with the date, job and resume counts and size. Click **Restore** next to the one from just before the import you want to undo. A snapshot of the current state is saved first, so a restore can itself be undone.
