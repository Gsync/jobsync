---
type: tutorial
title: Getting Started
description: The first run through JobSync — creating an account, connecting an AI provider, adding a job, and what each sidebar area is for.
feature: setup
tags: [setup, first run, sign in, account, ai provider, ollama, sidebar, navigation, dashboard, quick add, shortcuts, ai usage, tokens, goals, daily goals, calendar, interview questions]
aliases: [new user, onboarding, first steps, how do I start, set up jobsync, how much ai am i using]
status: stable
stale_after: 2027-08-31
---

# Getting Started

## How do I create an account and sign in?

Open the app and choose **Create Account** on the sign-in page, or go straight to `/signup`. JobSync accounts are local to your installation — there is no external identity provider and no email verification step, so the account you create is immediately usable. After signing up you land on the Dashboard at `/dashboard`. To sign in later, use `/signin` with the same email and password.

## How do I connect an AI provider?

Open the avatar menu at the bottom of the left sidebar and choose **Settings**, then **AI Provider**. Pick a provider, then a model. Ollama and OpenAI-compatible servers run models on your own machine. For hosted OpenAI, DeepSeek, Gemini and OpenRouter models, add an API key under **Settings → API Keys**. Keys are encrypted before they are stored.

Ollama uses the default URL shown under **Settings → API Keys**. Enter a custom base URL on the Ollama card or choose **Reset to default** to restore it. JobSync checks the selected local provider automatically. Use either card’s refresh button to check its connection.

For oMLX, LM Studio, llama.cpp or vLLM, save the server's base URL under **Settings → API Keys → OpenAI-compatible**. From Docker, use `http://host.docker.internal:<port>` and configure the server to listen on the network (in LM Studio, enable **Serve on Local Network**). You can also set `OPENAI_COMPATIBLE_BASE_URL` on the JobSync server. If your model server requires a key, set `OPENAI_COMPATIBLE_API_KEY` alongside its matching base URL. Load the model with at least 16k context for chat. If the server ignores the app's thinking setting, its model preset controls thinking.

Select both a provider and a model for resume review, job matching, cover letters and chat. If a local model list is empty, check that JobSync can reach the server and that it lists a chat model.

## What do the AI chat header buttons do?

Hover over the buttons in the upper-right corner of AI chat to see what they do. The trash icon (**Clear Session**) clears your conversation. On wider screens, the four outer corners (**Expand panel**) widen the chat. The icon then switches to four inner corners (**Restore panel**) to bring the chat back to its default width. **Close chat** hides the panel.

## What do the progress steps in AI chat mean?

The **Selected tool** row shows the tool chosen for each call, such as `review_resume`. When the assistant adds a job, reviews a resume, matches a job or writes a cover letter, the chat lists each step as it happens: adding a job resolves details, checks for an existing job and saves; a review loads your resume, prepares its text, generates the review, extracts scores and saves it; a match or cover letter loads the job and resume, prepares their text, generates, and saves. Once the resume is chosen, its step names it — for example *Using resume "Senior FS" (default)* — and says why it was picked: your default, the one linked to the job, or the one you're viewing. A finished step shows a green ✓, the current step an orange spinner, and a step that failed or timed out a red ✗ or **Timed out.**; if you stop the reply or close the panel it shows **Interrupted.** in grey. A grey circle means the assistant stopped without anything breaking — it asked you to pick a resume, found the job already saved, or was busy with another analysis — and the card below says why. The steps stay in the conversation after a reload.

Click the title in the **Using resume** step to open that resume, even while the analysis is running.

A checked step that took at least one second also shows its duration in whole seconds. For example, a 26.8-second generation shows **26s** once it finishes.

## How do I see how much AI I'm using?

Open the avatar menu at the bottom of the sidebar and choose **AI Usage**. It shows the last 7 or 30 days: total tokens, how many AI calls were made, typical response time and time to the first visible word, and how many calls failed — broken down by provider, model and feature (Agent chat, Job match, Automations, Resume review, Cover letter, Resume import), with the last 50 calls at the bottom. A chat message counts as one call; a review, match or cover letter it starts is counted separately under its own feature, and its time is not added to the chat's. Failures are split into provider errors, timeouts, truncated answers and interrupted streams; calls you stopped yourself are shown but never counted as failures. An amber "near context limit" badge on an Ollama model means those calls filled at least 90% of the model's context window, where Ollama silently drops the oldest text. History is kept for 90 days and is not part of the data backup.

## How do I add my first job?

Click **Jobs** in the sidebar, then the **Add Job** button in the top-right of the Jobs card. Job Title, Company, Job Location and Job Source are the fields you have to fill in yourself. Job Type, Workplace Type, Status, Due Date and Job Description are also required, but the form arrives with them already filled — Due Date three days out and Job Description the placeholder `N/A` — so you can change them but not leave them empty. Job URL, Salary Range, Date Applied, a resume, a cover letter and skills are the genuinely optional ones, and you can add them later.

There is a faster route once an AI provider is set: click **Chat AI** in the header, paste the full text of a job posting into the chat, and the assistant extracts the details and shows you exactly what it found before anything is saved. Nothing is written until you approve it.

## How do I save interview questions from AI chat?

Click **Chat AI**, then **Add a question** (or just type or paste your questions and ask the assistant to save them); they go straight into **Questions**, with no approval step, and an open Questions page updates by itself. If you gave no answers, the assistant may first ask whether you want to add any, or save them straight away; a question saved without an answer shows **TBD**, and you can fill it in later on the Questions page. It picks a few skill tags for each question itself.

Each question is checked against your bank first. One already saved, sent without an answer, is reported as already in your bank. For one already saved that you did answer, or one close to a saved question, the assistant asks what to do. Your answer can become the saved question's first answer if it has none, go below the saved answer, or replace it; a close match can also be saved as a new question, and any can be skipped. Without an answer, a close match can only be saved as new or skipped. Replace only works on questions an agent created that already have an answer; on one you wrote in the app, your answer can only be added to it. The saved question always keeps its wording. The check compares shared words, not meaning, so "Describe a conflict with a coworker" and "Tell me about a time you disagreed with a colleague" save as two questions.

The assistant reads the first 2,000 characters of a long paste. When your list runs past that, the result card names the last question read; paste the rest, starting after it.

## How do I add something quickly from the Dashboard?

The card in the top-left of the Dashboard has six buttons — **Add Job**, **Add Automation**, **Add Task**, **Add Question**, **Add Activity** and **Add Contact** — each opening the same form you would reach by navigating to that area yourself.

Five of them take you to the matching page with the form already open, so you land where the new record will appear. **Add Contact** is the exception: it opens the contact form over the Dashboard, and saving leaves you there rather than on **Library → Contacts**.

## How do I read the Daily Goals calendar?

The calendar at the top right of the Dashboard shows one month, with two rings under each day. The outer ring fills as you apply to jobs that day, towards your daily jobs target; the inner ring fills with the hours of finished activities started that day, towards your daily hours target. The key under the calendar shows which ring is which. A day where both targets are met is shown in bold, and hovering over a day, or tapping it, shows the exact numbers. Use the arrows beside the month name to look back up to 11 months; future days stay empty.

Above the calendar, the summary card shows the same month at a glance. The donut gives the share of days each goal was hit: past days of the month, plus today once that goal is met, so an unfinished today never lowers it. Beside it, "Both goals met" counts the days both targets were reached and "Nothing logged" counts past days with no applications and no finished activity. Current streak counts the days in a row, up to today, on which both goals were met; today joins it once both are met, and an unfinished today never breaks it. Best streak (12 mo) is the longest such run in the last 12 months. Both read the same on every month, and a run carries on across months. Both cards' arrows move together.

## How do I change my daily goals?

Click the ⚙ button (Set goals) at the bottom right of the Daily Goals calendar, set **Jobs applied per day** (1–50) and **Activity hours per day** (1–24), and click **Save goals**. The new targets apply to the current month and carry forward into later months until you change them again, so you don't need to set them every month. Earlier months keep the targets they had, so a past day you met stays met. Changing targets partway through a month re-judges that month's earlier days too.

## What is each area of the sidebar for?

- **Dashboard** — summary cards: application counts, recent jobs and activities, weekly charts, and a quick-add card for the six kinds of record you create most.
- **Jobs** — every job you are tracking, plus jobs discovered by automations.
- **Interviews** — every interview round across your jobs in one list, with filters and outcomes.
- **Automations** — scheduled searches that pull new postings in and score them against your resume.
- **Tasks** — to-dos with a due date, priority and percent complete, and a timed activity you can start from each one.
- **Activities** — time you spend on your job hunt, timed with a start/stop timer or logged afterwards, optionally started from a task.
- **Questions** — a question bank for interview preparation.
- **Profile** — your resumes, contact information and the profile the AI features read from.
- **Library** — the shared reference lists behind the dropdowns: Companies, Job Titles, Locations, Sources, Skills and Activity Types.

**Settings is not one of the entries above.** Open the avatar menu at the bottom of the sidebar instead, below the navigation list, and choose **Settings**. It holds AI Provider, API Keys, Appearance, Access Tokens and Data (backup, export and import). That same menu also has Notifications, AI Usage, Support and Logout.

## Where do I find installation and Docker instructions?

They are in the [project README](https://github.com/Gsync/jobsync#readme), not here. That covers running JobSync with Docker, the environment variables it reads, and how to upgrade an existing installation. These wiki pages assume you already have a running instance and cover using it.
