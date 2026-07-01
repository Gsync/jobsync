import MarkdownIt from "markdown-it";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { resolveTags, type ResolvedEntity } from "@/lib/jobs/resolve";

// html:false escapes any raw HTML in the input; TipTapContentViewer further
// strips unrecognized tags, so the stored/rendered answer is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

export interface CreateQuestionFromNamesInput {
  question: string;
  answer: string;
  tags?: string[];
  createdVia?: string;
}

export interface CreateQuestionFromNamesResult {
  questionId: string;
  resolutions: ResolvedEntity[];
  message: string;
}

export async function createQuestionFromNames(
  input: CreateQuestionFromNamesInput,
  userId: string,
): Promise<CreateQuestionFromNamesResult> {
  const { question, answer, tags = [], createdVia } = input;

  const resolvedTagsResult = await resolveTags(tags, userId, APP_CONSTANTS.MAX_JOB_TAGS);
  const resolutions: ResolvedEntity[] = resolvedTagsResult.resolved;

  const html = md.render(answer);

  const created = await prisma.question.create({
    data: {
      question,
      answer: html,
      createdBy: userId,
      createdVia: createdVia ?? null,
      tags: { connect: resolvedTagsResult.resolved.map((t) => ({ id: t.id })) },
    },
  });

  const message = buildSuccessMessage(resolutions, resolvedTagsResult.dropped, created.id);

  return {
    questionId: created.id,
    resolutions,
    message,
  };
}

function buildSuccessMessage(
  resolutions: ResolvedEntity[],
  droppedTags: string[],
  questionId: string,
): string {
  const parts = resolutions.map((r) => {
    const action = r.created ? "Created" : "Matched";
    return `${action} ${r.label}`;
  });
  let msg = parts.length > 0 ? parts.join("; ") + ". " : "";
  msg += `Question created (id: ${questionId}).`;
  if (droppedTags.length > 0) {
    msg += ` Dropped tags exceeding limit: ${droppedTags.join(", ")}.`;
  }
  return msg;
}
