---
type: how-to
title: Tasks
description: Keeping a to-do list for your job hunt — adding tasks, finding them again with the status filter and activity-type sidebar, marking them done, and starting a timed activity from one.
feature: tasks
tags: [tasks, task, to-do, todo, priority, due date, percent complete, status, activity type, start activity, save and start, group by, overdue, complete, cancelled, delete task]
aliases: [to-do list, todos, my tasks, task list, reminders]
status: stable
stale_after: 2027-09-14
---

# Tasks

## What are tasks for?

A task is one piece of work you want to get done — tailor a resume, follow up with a recruiter, prepare for Thursday's interview. Each task holds a title, an activity type, a status, a priority from 0 to 10, a percent complete, an optional due date and a rich-text description.

Tasks live under **Tasks** in the sidebar. Their activity type is what connects them to time tracking: starting an activity from a task logs the time you spend on it under **Activities**. Tasks are not linked to jobs; mention the job in the title or description if it matters.

## How do I add a task?

Click **New Task** in the Tasks card header, or **Task** at the bottom of the Dashboard card on the Dashboard. Only **Title** is required, and it needs at least two characters. The form arrives with Status set to **In Progress**, Priority at **5** and % Complete at **0%**.

**Activity Type** is a combo box: pick an existing type or type a new name to create one, the same list as **Library → Activity Types**. **Due Date** can be today or later but not in the past, and **Description** holds up to 2000 characters of formatted text.

**Save** adds the task. **Save & Start** adds it and immediately starts an activity from it, which is the quick way to begin working on something the moment you write it down — it needs an activity type, the same as starting from the list.

## Why don't I see all my tasks?

Because the list starts filtered to **In Progress** and **Needs Attention**, so completed and cancelled tasks are hidden. Click **Status** in the card header and tick **Complete** or **Cancelled** to bring them back. The filter goes back to its default when you reload the page.

Two other things narrow the list. The search box matches a task's title, description and activity type. The **Activity Types** panel on the left limits the list to one type, and that choice is kept in the address bar; pick **All** to clear it. The panel's counts include only tasks that are not complete or cancelled, whatever the Status filter says, and it lists only types that have such tasks. On a narrow screen the panel is hidden, and the arrow on its edge collapses it on a wide one.

## How are tasks sorted and grouped?

Highest priority first, then newest. The priority badge colours the number: 0–3 is Low, 4–6 Medium, 7–8 High and 9–10 Critical.

**Group by** in the card header splits the list into headed sections, each with a count:

- **Due Date** — Overdue, Today, Tomorrow, This Week, Later and No Due Date, in that order.
- **Created Date** and **Updated Date** — one section per day, newest first.
- **Activity Type** — one section per type, with No Activity Type for tasks without one.

Grouping, like the Status filter, resets when you reload the page.

## How do I mark a task done or change its status?

Tick the checkbox at the start of the row. The task becomes **Complete**, its row dims and its title is struck through; untick it to put it back to **In Progress**. Ticking the box does not change % Complete — edit the task if you want that at 100%.

For **Needs Attention** or **Cancelled**, open the row's **⋮** menu and choose **Change Status**. A task that leaves the Status filter's selection drops out of the list straight away. To change anything else, click the task's title or choose **Edit Task** from the same menu; the edit dialog also shows when the task was created and last updated. An icon beside a title means the task has a description, and hovering it shows the first lines.

## How do I start an activity from a task?

Choose **Start Activity** from the row's **⋮** menu, or hover the row and click the green play button at its end. An activity named after the task starts running under its activity type, and a banner with its running time appears at the top of every dashboard page until you stop it.

The task needs an activity type, and it cannot be complete or cancelled. If another activity is already running, you are asked whether to stop it first — **Stop & Start** does both. You can start from the same task as many times as you like; each start logs a new activity linked to that task, so the time you spend on it adds up over several sittings.

## Why can't I delete a task?

Because an activity is linked to it. Once you have started an activity from a task, the task is kept so that logged time still has its task, and **Delete** fails with *Cannot delete task with linked activity*. Delete those activities under **Activities** first, then delete the task — or set the task to **Cancelled** to keep the history and hide it from the list.

A task that never had an activity started from it deletes straight away after you confirm. There is no undo.

The same link works the other way: an activity type cannot be deleted from **Library → Activity Types** while any task uses it, and the message says how many tasks are in the way.
