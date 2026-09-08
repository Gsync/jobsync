---
type: how-to
title: Jobs
description: Adding jobs by hand or by pasting a posting into AI chat, moving them through the status workflow, and finding, editing, exporting or deleting them.
feature: jobs
tags: [jobs, applications, add a job, status, applied, interview, offer, offer accepted, offer declined, rejected, csv, export, paste, filter, search, job details, tabs, notes, ai match, cover letter]
aliases: [job tracker, application tracker, my jobs, job board, track an application, job list]
status: stable
stale_after: 2027-08-31
---

# Jobs

## How do I add a job manually?

Open **Jobs** in the sidebar and click **Add Job** at the top-right of the Jobs card. Job Title, Company, Job Location and Job Source are the fields you must fill in — each is a combo box that either picks an existing entry or creates a new one as you type, and Location and Source come pre-selected with whatever you used on your last job.

Job Type, Workplace Type, Status, Due Date and Job Description are required too, but the form opens with them already set — Job Type on its first option, Workplace Type on Onsite, Status on Draft, Due Date three days from today and Job Description the placeholder `N/A`. You can change any of them; you cannot clear them. Genuinely optional are Job URL, Salary Range, the Applied switch, Date Applied, a resume and cover letter to attach, and skills. Salary Range is free text: pick one of the 10,000-wide suggestions from `Under 50,000` to `300,000+`, or type your own — `$120k – $150k`, `Negotiable` — and it is saved exactly as typed and shown on the job's details page.

Paste the full posting text into Job Description if you have it. The AI features — resume review, job match and cover letter generation — read that field, and a job saved with only a title and a salary gives them almost nothing to work from.

## How do I add a job by pasting a posting into AI chat?

Click **Chat AI** in the header to open the assistant panel, paste the full text of a job posting into the message box, and send it. The assistant extracts the title, company, location and description and shows you an approval card with exactly what it found. Nothing is saved to your tracker until you approve that card, and you can edit the details before you do.

This requires an AI provider and model to be set under **Settings → AI Provider**; without them the panel tells you so instead of starting. A long paste is attached as a chip rather than inlined into the message — that is expected, and the full text still reaches the extraction.

## What do the job statuses mean?

A job carries exactly one status from: **New**, **Draft**, **Applied**, **Interview**, **Offer**, **Offer Accepted**, **Offer Declined**, **Rejected**, **Expired** and **Archived** — *Offer Declined* for an offer you turned down, *Rejected* for one the company turned down. They are labels you move by hand, not a state machine — nothing stops you going from Interview back to Draft, and nothing changes a status on your behalf.

## How do I change a job's status?

There are two ways. In the Jobs list, click a row's status badge and pick the new status from the menu. Or open the job and use the **⋮** menu at the top-right of the job details, choosing **Change status**. Either menu lists every status with the current one greyed out, and the change saves immediately — there is no separate save step.

The Add Job dialog also has a Status field, so a status can be set when you first create the job or from **Edit Job** later.

## What is on a job's details page?

Three parts, top to bottom. A **header row** with the job title, a `Company · Location · Job Type · Workplace` line, and the actions: Match with AI, Cover Letter, Edit, Delete and a **⋮** menu. Below it a **summary card** of eight facts — Status, Job Type, Salary Range, Source, Applied, AI Match, Resume and Added — with the job URL and any skill badges on a divider row underneath. Below that, four **tabs**.

The tabs are **Description**, **AI Match**, **Cover Letter** and **Notes**, and all four are always there. AI Match and Cover Letter stay in the bar even when the job has neither, showing a short explanation and a button to run it — so the tab set never shifts between jobs. Notes carries a count badge once the job has notes. The tab you are on is kept in the address bar, so a refresh, a bookmark or the browser Back button lands you back on the same one.

## How do I edit, annotate or delete a job?

**Edit** and **Delete** are buttons in the header row of the job details page, and both are also in the **⋮** menu next to them. **Edit** reopens the same dialog you added the job with, pre-filled. **Delete** asks for confirmation and then removes the job permanently — there is no undo and no trash, so use *Archived* status instead if you only want it out of the list.

Notes live on the **Notes** tab: **New Note** there adds one, and each note can be edited or deleted from its own card. **Add a Note** in the **⋮** menu is a shortcut to the same thing from anywhere on the page — it switches to the Notes tab and opens the editor.

## How do I find a job in a long list?

The Jobs card header has three tools. The **search box** matches on job text. The **filter dropdown** narrows to a preset: All (Except Dismissed), Applied, Interview, Draft, Rejected, Part-time, Accepted (discovered) or Dismissed (discovered). Clicking a company, title, location or source anywhere in the list adds it as a filter chip next to the search box — click the chip's **×** to clear it.

The list also has a view toggle for table or card layout, and a reload button that refetches without a full page refresh.

## How do I run an AI match from the jobs list?

A job that has no AI match score shows a **Match** button where its score would be — in the Match column in table view, and in the top-right corner of the card in card view. Clicking it opens that job's details page on the **AI Match** tab and starts the match straight away, so you do not have to open the job and click again. The match itself runs in the assistant panel exactly as it does from the job's own **Match with AI** button; when it finishes, the analysis is already on the tab in front of you.

Jobs that already have a score show the score instead. To re-run a match on one of those, open the job and use **Match with AI** in its header.

## How do I export my jobs to CSV?

Click **Export** in the Jobs card header. Your jobs download as a CSV file named `jobsync-YYYY-MM-DD.csv`. The export covers your jobs, not the reference lists behind them — for a complete, restorable copy of everything including resumes, tasks and activities, use **Settings → Data** instead.
