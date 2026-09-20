---
type: how-to
title: Job Timeline
description: Recording how a job moved through its hiring process — the stages, when each happened, who interviewed you and which questions they asked.
feature: timeline
tags: [timeline, stages, job stage, interview, interview rounds, screening, onsite, offer, withdrawn, prep list, interview questions, interviewers, update status, current stage, stage history]
aliases: [stages, job stages, interview timeline, hiring process, stage history]
status: stable
stale_after: 2027-09-30
---

# Job Timeline

## What is the Timeline tab for?

The **Timeline** tab on a job's details page is that job's record of how the hiring process actually moved — one entry per stage, each with its own date, notes and outcome. A job's [status](./jobs.md) is a single label saying where the job is *now*; the timeline is the history behind that label, and the status is derived from it.

The tab shows two things. A **Stage History** list down the left walks every stage in the order set by **Library → Stages**, joined top to bottom by a connecting line: a green tick marks each stage already behind you, a filled marker the current one, and a hollow marker the greyed **Offer** step at the end if the job has not reached an offer yet. Clicking a stage opens its **detail panel** on the right. An interview stage splits that panel into three tabs — **Overview**, **Interviewer** and **Prep List** — and opens on Overview; any other stage shows the overview on its own, with no tabs, because the other two have nothing to say about it.

A count badge on the tab tells you how many stages a job has. Every job created after this feature shipped starts with one.

## How do I add a stage?

Use **Add stage** at the bottom of the Stage History list, or the **Update Status** button in the job header and then **Add Stage**. Both open the same dialog.

Pick a **stage** from the list — *New*, *Draft*, *Applied*, *Interview*, *1st Screening Interview*, *2nd Technical Interview*, *Final / Onsite Interview*, *Offer*, *Offer Accepted*, *Offer Declined*, *Rejected*, *Expired*, *Archived* and *Withdrawn* are set up for you — or type your own name into **Or enter a custom stage name** and choose the **parent status** it means. A custom name is saved to your Library, so the second job that reaches your *Panel Interview* just picks it from the list.

**Date** and **Time** are optional, and **Notes** is free text. If the stage's parent status is *Interview*, three more fields appear: **Format**, **Duration** and **Location** — use Location for a meeting link as happily as for a street address. **Set as current stage** is ticked by default; leave it ticked when you are recording where the job is now, and untick it when you are backfilling something that already happened.

Editing a stage later opens the same dialog with one extra field, **Outcome**: *Scheduled*, *Completed*, *Passed*, *Failed*, *No-show* or *Cancelled*. Outcome, location, format and duration all read back on the stage's **Overview** tab, above the notes box.

## How do I delete a stage?

Select the stage, then use the **bin button** at the top right of its detail panel, beside **Edit**. You are asked to confirm, and the stage goes along with its notes, its interviewer links and its prep list — the contacts and questions themselves stay in your Library.

Deleting the **current** stage moves the job back to the stage before it, and the job's status follows that stage; the confirmation says so. Deleting the last stage a job has leaves it with no timeline at all, which is a supported state — the job simply keeps the status it had.

## How does a stage change the job's status?

The current stage sets the job's status: whatever parent status that stage's type carries becomes the job's status, everywhere the job is shown. Adding a stage with **Set as current stage** ticked moves the status; ticking the box on an older stage moves it back.

It works the other way round too. Changing the status from **Update Status → Change status**, from a row's status badge in the Jobs list, or from the Status field in the **Edit Job** dialog appends a new stage for that status and makes it current — so a status change never leaves the timeline behind. The appended stage has no date, because none of those places asks you for one; open it from the Timeline tab and add the date if you know it.

Re-picking a status the job already holds does nothing at all. If the current stage is *2nd Technical Interview* and you pick **Interview** from a dropdown, you already are at Interview, so no second stage is added.

Marking a job *Applied* or *Interview* this way also sets its **Applied** flag, and an *Applied* stage fills in the applied date if the job has none yet. A date already recorded is never overwritten.

Stages are laid out in the order **Library → Stages** gives their types, not by date, so a job you added weeks after applying to it still reads New then Applied. Dates decide the order only between stages of the same type — two interview rounds of the same kind, say.

That means a job added long after you applied can show its New stage with a later date than its Applied stage. Nothing is wrong: the New date records when the job entered JobSync, which really was after you applied.

## Why does a stage show a dash instead of a date?

Because that stage has no date, which is allowed. Dates are optional on every stage: a stage appended by a status change never has one, and neither does a stage you added without filling the Date field.

An undated stage reads `—` in the Stage History list, and **No date set** in its detail panel. Among stages of the same type it sorts to the end rather than to the start. Open the stage and use **Edit** to add the date whenever you learn it.

## How do I record who is interviewing me?

Select the interview stage, then use **Link** on its **Interviewer** tab, or **Update Status → Link Interviewers**. The dialog searches your existing [contacts](./contacts.md); the **Add a new contact** box at the bottom takes a name, role and email and creates the person on the spot.

Linking someone also adds them to the job's **Contacts** tab with the **Interviewer** role, so that tab stays the single roster of everyone involved in the application. The reverse is not true: the **✕** beside an interviewer unlinks them from *that stage only* and leaves the job contact link alone, because the person may hold other roles on the job.

The same person can be linked to several stages of the same job, and a contact you link here is an ordinary contact afterwards — editable and searchable under **Library → Contacts** like any other.

## How do I build a prep list for an interview?

Select the interview stage and use **Add Questions**, either the button on its **Prep List** tab or **Add to Prep List** in the **Update Status** menu. The dialog lists your question bank with an instant search over it; tick as many questions as you like and add them in one go.

To add a question that is not in the bank yet, type it into the box at the bottom, optionally pick any number of **skill tags**, and add it. It is saved to your question bank as well as to this stage's prep list, so every later job can reach it — the bank is shared, not per-job. A question added this way is banked with the placeholder answer `TBD`; fill in the real answer from the Questions page when you are ready.

A question whose answer is filled in shows a chevron; click the question or the chevron to read the answer without leaving the tab, or use **Expand all** to open every answered question at once. A question still holding the `TBD` placeholder reads **No answer yet** instead.

A question can be on the prep lists of several stages at once, and **✕** beside one removes it from this stage's list without touching the bank.

## What is the difference between a question on a prep list and one marked "asked"?

A prep-list question is one you *expect*; the checkbox beside it records that it was *actually asked*. Tick it during or after the interview and it saves immediately — there is no separate save step — and the **Prep List** tab carries a running `2 of 5` tally, so you can read the progress without opening the tab.

The distinction is what makes the list useful afterwards: which of the questions you prepared for came up, and which did not. Marking a question asked never changes the question itself or its answer in your bank.

One knock-on effect: a question that is on any prep list cannot be deleted from the question bank. The Questions page refuses with a count of the interview stages using it. Remove it from those prep lists first, then delete.

## Why are Link Interviewers and Add to Prep List greyed out?

Because the stage they would act on is not an interview stage. Both items are gated on the *kind* of stage, never on its timing — an interview three weeks away is still an interview stage, and you can link its panel and prep for it from the day it is scheduled.

The menu tells you which stage it is targeting and why: it reads **"Applied is not an interview stage"** when the selected stage is not one, and **"Add a stage first"** when the job has no stages at all. Both items act on the stage you have selected on the Timeline tab, falling back to the current stage — so if the job's current stage is *Applied* and you want to link an interviewer, add or select the interview stage first.

A stage counts as an interview stage when its parent status is *Interview*. That is true of the three seeded interview rounds, and of any custom stage type you created under the Interview status.

## Can I rename or add my own stages?

Yes — **Library → Stages** holds the full list, and the stage types there are yours. **New Stage** adds one, and the **⋮** menu on a row has **Edit** to rename it or change which status it means, plus **Move Up** and **Move Down** to reorder them — that order drives both the list the Add Stage dialog shows you and the order stages appear in on every job's timeline. A new stage type you type into the Add Stage dialog slots in after the last type of the same parent status, so it lands beside its siblings rather than at the bottom of the list. A **Stages** column tells you how many job stages currently use each type.

A stage type that is in use cannot be deleted: the tab refuses and tells you how many job stages are using it. Change or remove those stages first, then delete the type.

Two near-identical names stay two separate types — *On-site* and *Onsite* are different entries, because matching folds case and accents but not punctuation. If you end up with a duplicate, rename or delete one here.

## Why does a job have no timeline at all?

Because it was never given a stage. The most common cause is restoring a backup taken before the timeline existed: those jobs come back with their status intact but with no stages behind it, and that is a supported state rather than an error.

The Timeline tab shows **No stages recorded yet** with an **Add stage** button, and the job's status stays exactly as it is until a stage sets it. Adding the first stage starts the timeline from there; nothing is invented about the job's past.
