/**
 * Language rules
 * Every prompt in this app is written in English, so without an explicit rule
 * models drift to English even for a French, German or Japanese resume. The
 * rule is language-agnostic on purpose: the model follows whatever language
 * the documents are in. Machine-parsed tokens (the SCORES line and the "##"
 * headings that jobMatch/parse.ts and coverLetter/matchGuidance.ts key on)
 * stay English.
 *
 * Each rule is used twice: in the system prompt, and as a one-line reminder
 * beside the documents in the user prompt, because small local models weigh
 * the text next to the document more than a rule buried in a long system
 * prompt.
 */

const KEEP_PARSED_TOKENS =
  'Keep the "SCORES:" line and the "##" section headings exactly as specified, in English, because the app parses them.';

export const ANALYSIS_LANGUAGE_RULE = `## LANGUAGE
Write all analysis prose in the language of the resume and job description (not the language of these instructions). If they are bilingual, use the language most of the text is written in. ${KEEP_PARSED_TOKENS} Quote resume and job-posting phrases, and any keywords to add, in their original language.`;

export const ANALYSIS_LANGUAGE_REMINDER = `IMPORTANT — LANGUAGE: identify the language the documents above are written in, and write every sentence of your analysis in that language. Do not write in English unless the documents are in English. ${KEEP_PARSED_TOKENS}`;

export const COVER_LETTER_LANGUAGE_RULE = `## LANGUAGE
Write the whole letter in the language of the job description (not the language of these instructions), including the salutation and sign-off: translate "Dear Hiring Manager," and "Sincerely," into that language. Keep employer names, job titles and quoted resume phrases as the documents give them.`;

export const COVER_LETTER_LANGUAGE_REMINDER =
  "IMPORTANT — LANGUAGE: write the whole letter in the language of the job description, including the salutation and sign-off. Do not write in English unless the job description is in English.";

export const CHAT_LANGUAGE_RULE =
  "Always reply in the language of the user's most recent message, not the language of these instructions, and switch when they switch. Keep tool arguments such as jobDescription in the language the user supplied. Reviews, match analyses and cover letters are written by the app in the language of the documents involved.";
