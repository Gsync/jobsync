---
type: tutorial
title: Getting Started
description: The first run through JobSync — creating an account, connecting an AI provider, adding a job, and what each sidebar area is for.
feature: setup
tags: [setup, first run, sign in, account, ai provider, ollama, sidebar, navigation]
aliases: [new user, onboarding, first steps, how do I start, set up jobsync]
status: stable
stale_after: 2027-08-31
---

# Getting Started

## How do I create an account and sign in?

Open the app and choose **Create Account** on the sign-in page, or go straight to `/signup`. JobSync accounts are local to your installation — there is no external identity provider and no email verification step, so the account you create is immediately usable. After signing up you land on the Dashboard at `/dashboard`. To sign in later, use `/signin` with the same email and password.

## How do I connect an AI provider?

Open the avatar menu at the bottom of the left sidebar and choose **Settings**, then **AI Provider**. Pick a provider, then a model. JobSync supports Ollama, OpenAI, DeepSeek, Gemini and OpenRouter. Ollama runs models on your own machine and needs no key; the other four are hosted and need an API key, which you add under **Settings → API Keys** in that same menu. Keys are encrypted before they are stored.

Nothing AI-powered works until a provider *and* a model are both set — resume review, job matching, cover letters and the chat panel all refuse to start rather than silently picking a model for you. If you selected Ollama and the model list is empty, JobSync could not reach the Ollama server; check that it is running and reachable from wherever JobSync is running.

## How do I add my first job?

Click **Jobs** in the sidebar, then the **Add Job** button in the top-right of the Jobs card. Job Title, Company, Job Location and Job Source are the fields you have to fill in yourself. Job Type, Workplace Type, Status, Due Date and Job Description are also required, but the form arrives with them already filled — Due Date three days out and Job Description the placeholder `N/A` — so you can change them but not leave them empty. Job URL, Salary Range, Date Applied, a resume, a cover letter and skills are the genuinely optional ones, and you can add them later.

There is a faster route once an AI provider is set: click **Chat AI** in the header, paste the full text of a job posting into the chat, and the assistant extracts the details and shows you exactly what it found before anything is saved. Nothing is written until you approve it.

## What is each area of the sidebar for?

- **Dashboard** — summary cards: application counts, recent jobs and activities, and weekly charts.
- **Jobs** — every job you are tracking, plus jobs discovered by automations.
- **Automations** — scheduled searches that pull new postings in and score them against your resume.
- **Tasks** — to-dos with a due date, priority and percent complete, optionally linked to a job.
- **Activities** — time logged against jobs and tasks, with a calendar view.
- **Questions** — a question bank for interview preparation.
- **Profile** — your resumes, contact information and the profile the AI features read from.
- **Library** — the shared reference lists behind the dropdowns: Companies, Job Titles, Locations, Sources, Skills and Activity Types.

**Settings is not one of the entries above.** Open the avatar menu at the bottom of the sidebar instead, below the navigation list, and choose **Settings**. It holds AI Provider, API Keys, Appearance, MCP Access and Data (backup, export and import). That same menu also has Support and Logout.

## Where do I find installation and Docker instructions?

They are in the [project README](https://github.com/Gsync/jobsync#readme), not here. That covers running JobSync with Docker, the environment variables it reads, and how to upgrade an existing installation. These wiki pages assume you already have a running instance and cover using it.
