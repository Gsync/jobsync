---
type: how-to
title: Jobs
description: Adding jobs by hand or by pasting a posting into AI chat, moving them through the status workflow, and finding, editing, exporting or deleting them.
feature: jobs
tags: [jobs, applications, add a job, status, applied, interview, offer, rejected, csv, export, paste, filter, search]
aliases: [job tracker, application tracker, my jobs, job board, track an application, job list]
status: stable
stale_after: 2027-08-31
---

# Jobs

## How do I add a job manually?

Open **Jobs** in the sidebar and click **Add Job** at the top-right of the Jobs card. Job Title, Company, Job Location and Job Source are the fields you must fill in — each is a combo box that either picks an existing entry or creates a new one as you type, and Location and Source come pre-selected with whatever you used on your last job.

Job Type, Workplace Type, Status, Due Date, Salary Range and Job Description are required too, but the form opens with them already set — Job Type on its first option, Workplace Type on Onsite, Status on Draft, Due Date three days from today, Salary Range `1` and Job Description the placeholder `N/A`. You can change any of them; you cannot clear them. Genuinely optional are Job URL, the Applied switch, Date Applied, a resume and cover letter to attach, and skills.

Paste the full posting text into Job Description if you have it. The AI features — resume review, job match and cover letter generation — read that field, and a job saved with only a title and a salary gives them almost nothing to work from.

## How do I add a job by pasting a posting into AI chat?

Click **Chat AI** in the header to open the assistant panel, paste the full text of a job posting into the message box, and send it. The assistant extracts the title, company, location and description and shows you an approval card with exactly what it found. Nothing is saved to your tracker until you approve that card, and you can edit the details before you do.

This requires an AI provider and model to be set under **Settings → AI Provider**; without them the panel tells you so instead of starting. A long paste is attached as a chip rather than inlined into the message — that is expected, and the full text still reaches the extraction.

## What do the job statuses mean?

A job carries exactly one status from: **New**, **Draft**, **Applied**, **Interview**, **Offer**, **Rejected**, **Expired** and **Archived**. They are labels you move by hand, not a state machine — nothing stops you going from Interview back to Draft, and nothing changes a status on your behalf.

*New* is where a job discovered by an automation starts. *Draft* is a job you have entered but not applied to. *Applied* through *Offer* track a live application. *Expired* is for a posting that closed before you acted; *Archived* is for anything you want out of the way without deleting it.

## How do I change a job's status?

Open the job from the Jobs list, click the **⋮** menu at the top-right of the job details, and choose **Change status** — the submenu lists every status, with the current one greyed out. The change saves immediately; there is no separate save step.

The Add Job dialog also has a Status field, so a status can be set when you first create the job or from **Edit Job** later.

## How do I edit, annotate or delete a job?

All three are in the **⋮** menu on the job details page. **Edit Job** reopens the same dialog you added it with, pre-filled. **Add a Note** attaches a note to the job. **Delete** asks for confirmation and then removes the job permanently — there is no undo and no trash, so use *Archived* status instead if you only want it out of the list.

## How do I find a job in a long list?

The Jobs card header has three tools. The **search box** matches on job text. The **filter dropdown** narrows to a preset: All (Except Dismissed), Applied, Interview, Draft, Rejected, Part-time, Accepted (discovered) or Dismissed (discovered). Clicking a company, title, location or source anywhere in the list adds it as a filter chip next to the search box — click the chip's **×** to clear it.

The list also has a view toggle for table or card layout, and a reload button that refetches without a full page refresh.

## How do I export my jobs to CSV?

Click **Export** in the Jobs card header. Your jobs download as a CSV file named `jobsync-YYYY-MM-DD.csv`. The export covers your jobs, not the reference lists behind them — for a complete, restorable copy of everything including resumes, tasks and activities, use **Settings → Data** instead.
