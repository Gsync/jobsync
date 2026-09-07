---
type: how-to
title: Automations
description: Setting up a scheduled ATS search over company job boards, filling in the filters and resume skills that make it return good matches, and handling the jobs it discovers.
feature: automations
tags: [automations, job search, scheduled search, greenhouse, lever, ashby, ats, company boards, watchlist, discovered jobs, match score, keywords, target titles, locations, resume skills, filters]
aliases: [automated job search, job discovery, scheduled job search, job scraper, run a search, discovered jobs]
status: stable
stale_after: 2027-09-30
---

# Automations

## What does an automation do?

An automation is a saved search that runs once a day and brings new job postings to you. It reads the public job boards of the companies you pick, drops the listings that have nothing to do with what you asked for, sends the most promising ones to your AI provider to be scored against one of your resumes, and saves the results as **discovered jobs** you can accept into your tracker or dismiss.

Everything is company-centric: JobSync reads job boards hosted by **Greenhouse**, **Lever** and **Ashby**, so you choose employers rather than searching the whole internet. One automation covers one of those three boards; create a second automation if you want to track companies on another.

An automation needs an AI provider and model set under **Settings → AI Provider**, and a resume in your profile to match against.

## How do I create an automation?

Open **Automations** in the sidebar and click **Create Automation**. The wizard has six steps:

1. **Basics** — a name, and which job board (Greenhouse, Lever or Ashby) the companies live on.
2. **Search** — the companies to track, then your filters: target job titles, keywords/skills, locations, and how many listings get full AI analysis per run. This is the step that decides how useful the automation is; see the next two sections.
3. **Resume** — the resume every discovered job is scored against.
4. **Matching** — a match threshold. Listings scoring above it are flagged as strong matches; nothing is thrown away because of it.
5. **Schedule** — the hour of the day the automation runs (server time). Only one automation may occupy an hour, so hours already taken are marked **In use** and rejected.
6. **Review** — confirm and save.

At least one company is required. Everything else has a working default, but defaults alone will not give you good results.

If you have built a watchlist, the company picker in step 2 shows a **Watched** group at the top listing the companies you watch on that automation's job board, with an **Add all watched** button that selects them in one click. Only companies on the matching board appear — a watchlist spanning all three providers contributes a different subset to each automation.

## Which companies can I track, and how many?

Up to **25 companies** per automation. In the Search step, open the company picker and type a name — JobSync searches an indexed directory of known Greenhouse, Lever and Ashby boards for that provider and you tick the ones you want. The count next to the label shows how many of your 25 slots are used.

If a company is not in the directory, add it by hand: paste its board URL (for example `https://boards.greenhouse.io/acme` or `https://jobs.lever.co/acme`) or just its board token into the field below the picker, and press **+**. JobSync resolves it, checks the board really exists, and adds it as a chip. Remove any company with the **×** on its chip.

You can also build a shortlist ahead of time. Open **Library → Companies**, switch the scope dropdown from **My Companies** to **Greenhouse**, **Lever** or **Ashby** under *Browse boards*, and you get the full directory of boards JobSync knows about for that provider — search it, and click **Watch** on any company you care about. Watched companies collect under the **Watchlist** scope, where each row links straight to the live board so you can check whether it is still posting.

Watching a company adds it to your Library, so a company you already track just gains its board link — JobSync asks you to confirm that first. Unwatching only removes it from the watchlist; the company stays in your Library along with any jobs attached to it.

## How do I set up filters so the automation returns good results?

**Fill in the filters. This is the single biggest factor in whether an automation is useful.** A company board can carry hundreds of listings across every department; the filters are what turn that into a short list worth your attention.

- **Target job titles** — the roles you actually want, e.g. `Frontend Engineer`, `Staff Software Engineer`. A listing whose title matches one of these ranks far higher than one that does not.
- **Keywords / skills** — the technologies and terms that describe your work, e.g. `React`, `TypeScript`, `Kubernetes`. These are matched against both the title and the full description, so they catch good roles whose title is worded oddly.
- **Locations** — the cities, provinces/states or countries you would work in, e.g. `Calgary`, `Seattle`, `San Francisco`, `Canada`. Locations do **not** affect ranking on their own. They only take effect when you turn on **Only show jobs in these locations**, which drops non-matching listings before ranking. Avoid adding `Remote` here: a listing matches if its location text contains any of your entries, so `Remote` lets through remote roles anywhere in the world, including places you cannot work.

Add several of each rather than one. Specific terms count for more than generic ones — `kubernetes` is worth more than `engineer`, which appears in almost every listing.

Leaving both target titles and keywords empty is the common mistake: with nothing to rank against, every listing fails the relevance floor and the run saves nothing. The wizard shows an amber warning when both are empty.

## Why does my matching resume need a skills section?

Because the skills on your resume are used as extra keywords when listings are ranked. Every skill tag in your resume's **Skills** section is added to the keywords you typed in the wizard, so a resume with a well-filled skills section widens what the automation can recognise without you having to type every term twice.

The skills section also goes into the text handed to the AI for the match score, so it improves the scoring as well as the shortlisting.

To add one, open **Profile**, open the resume you use for matching, and click **Add Skills**. Group your skills into categories (up to 8, with up to 20 skills each) — for example *Languages*, *Frameworks*, *Cloud* — and list the real technology names you would want a posting to mention.

A resume with no skills section still works, but the automation then has only your typed keywords to go on. Pair a filled-in skills section with a good set of target titles and keywords for the best results.

## How many listings does each run analyze?

Two tiers. **Jobs analyzed per run** (the slider in the Search step, default 10, maximum 50) is how many top-ranked listings get a full AI match score. Higher means more coverage but slower and, on a paid provider, costlier runs.

**Save additional relevant listings** is on by default. With it on, relevant listings that did not make the cut are still saved, ranked but not yet AI-scored — they show a lexical relevance percentage and an **Analyze** button so you can score one on demand. Turn it off if you only want the scored shortlist.

## When does it run, and can I run one now?

An automation runs daily at the hour you chose, in the server's timezone, as long as its status is **active**. Open an automation to run it immediately with **Run Now** — manual runs are limited to **5 per hour**. A run in progress can be stopped with **Abort Run**.

The automation's page has three tabs: **Logs** (live output from the current or most recent run), **Discovered Jobs**, and **Run History** (past runs with counts and timings).

## What do I do with a discovered job?

Every discovered job starts as **new**. Open the **Discovered Jobs** tab and, for each one, choose:

- **Accept** — copies it into your tracked jobs, where it behaves like any job you added by hand.
- **Dismiss** — marks it dismissed so it stops cluttering the list. It is not deleted.
- **Analyze** — appears on listings that were saved without an AI score, and scores one on demand.

Click a job to open its details, including the AI match breakdown and, for unscored listings, the relevance breakdown that explains which of your titles and keywords it hit. The **Status** filter in the header narrows the list to new, accepted or dismissed, and **Clear** removes discovered jobs in bulk.

## How do I pause, edit or delete an automation?

From the list, use the **⋮** menu on any automation; from its own page, use the buttons in the header. **Pause** stops the daily schedule without losing the automation or the jobs it found — **Resume** starts it again. **Edit** reopens the wizard with everything pre-filled, which is where you go to widen filters that are returning too little.

**Delete** removes the automation permanently, along with its runs and discovered jobs, after a confirmation. Accept anything you want to keep first.

If an automation shows **Resume missing**, the resume it matched against was deleted — edit it and pick a new one before it can run again.
