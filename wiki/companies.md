---
type: how-to
title: Companies
description: A company's details page — its jobs, the people you know there, its job board and watch state — and how to get there, watch it, add a contact at it or delete it.
feature: companies
tags: [companies, company, company details, company page, watchlist, watch, unwatch, job board, careers page, website, industry, company contacts, delete company]
aliases: [company page, employer, employers, company profile]
status: stable
stale_after: 2027-09-13
---

# Companies

## What is on a company's details page?

Three parts, top to bottom. A **header row** with the company's logo and name, a line with its industry and website, and the actions: **Watch** (or **Unwatch**), **Edit**, **Delete** and a **⋮** menu linking to the company's website, careers page and job board. Each link appears only when the company has one, and the menu is hidden when it has none.

Below it a **summary card** of eight facts: Watchlist, Board, Industry, Website, Careers page, Jobs, Applied and Contacts. Jobs and Applied count the jobs listed on the page, which leaves out jobs you dismissed from an automation — so Jobs can be lower than **Total Jobs** in **Library → Companies**, which counts them. Contacts counts everyone on the Contacts tab once, even someone who both works there and worked with you there — so it can be higher than the Contacts column in **Library → Companies**, which counts only the people who work there now.

Below that, two **tabs**. **Jobs** lists your jobs at the company, newest first, with status, location, applied date, AI match score and source; click a title to open the job. Jobs you dismissed from an automation are left out, the same as on the Jobs page. **Contacts** splits the people into **Works here** and **Worked with you here**, and a person who is both appears in both. Each tab carries a count badge once it has anything, and the tab you are on is kept in the address bar.

## How do I get to a company's page?

From **Library → Companies**, click the company's name, or open its **⋮** menu and choose **View details**. This works in both the My Companies and Watchlist scopes, and **Back** on the company page returns you to the scope you came from.

From a job, click the company name in the line under the job title on the job's details page.

## How do I watch or unwatch a company?

Click **Watch** in the company page's header. It becomes **Unwatch** once the company is on your watchlist, and the Watchlist fact in the summary card shows how long ago you started watching. Unwatching only takes the company off the watchlist — it stays in your Library with its jobs and contacts. The same toggle is in the company's **⋮** menu in **Library → Companies**.

A watched company with a job board shows up in the **Watched** group when you pick companies for an [automation](./automations.md).

## How do I add a contact at a company?

Open the company's **Contacts** tab and click **Add Contact**. The contact dialog opens with this company already filled in as where they work, so a name is all you need. To edit or delete someone, use the **⋮** menu on their row; the arrow at the start of the row expands their email, phone, notes and linked jobs.

For a former colleague who works somewhere else now, change Company to their current employer, set Role to **Reference** and pick this company under **Worked together at**. They then appear under **Worked with you here**. More in [Contacts](./contacts.md).

## Why can't I delete a company?

Because something still points at it. A company cannot be deleted while it has jobs, while an entry in one of your resumes' experience sections uses it, or while a contact works there or worked with you there. Jobs include ones you dismissed from an automation, which the Jobs page only shows when you pick its **Dismissed (discovered)** filter.

Jobs are checked before you confirm: **Delete** opens an explanation instead of a confirmation, with the number of jobs. Resume entries and contacts are checked when you confirm, and the message says what is in the way. The contact case is covered in [Contacts](./contacts.md#why-cant-i-delete-a-company-or-location). Remove or reassign whatever is blocking, then delete the company.
