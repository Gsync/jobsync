// Hand-edited. A failure means the code broke the MCP tools/list promise.
// Fix the tool. Never regenerate (see src/lib/mcp/CLAUDE.md).
import type { ToolContract } from "../helpers/toolContract";

const statuses = [
  "new", "draft", "applied", "interview", "offer", "offer-accepted",
  "offer-declined", "rejected", "expired", "archived", "withdrawn",
];
const workplaces = ["Remote", "Hybrid", "Onsite"];
const mergeModes = ["append", "replace"];

const jobFields = {
  company: "string", jobTitle: "string", jobDescription: "string",
  location: "string", source: "string", jobType: "string", workplaceType: "string",
  status: "string", dueDate: "string", applied: "boolean", appliedDate: "string",
  jobUrl: "string", salaryRange: "string", tags: "array", "tags[]": "string",
};

export const MCP_TOOLS_BASELINE: Record<string, ToolContract> = {
  add_job: {
    args: { ...jobFields, allowDuplicate: "boolean", upsert: "boolean" },
    required: ["company", "jobTitle", "jobDescription"],
    enums: { workplaceType: workplaces, status: statuses },
  },
  find_job: {
    args: { jobUrl: "string", company: "string", jobTitle: "string", location: "string" },
    required: [], enums: {},
  },
  list_jobs: {
    args: {
      company: "string", status: "string", source: "string", createdAfter: "string",
      limit: "integer", offset: "integer",
    },
    required: [], enums: { status: statuses },
  },
  update_job: {
    args: { jobId: "string", ...jobFields },
    required: ["jobId"], enums: { workplaceType: workplaces, status: statuses },
  },
  add_question: {
    args: {
      question: "string", answer: "string", tags: "array", "tags[]": "string",
      notSameAs: "array", "notSameAs[]": "string", mergeInto: "object",
      "mergeInto.questionId": "string", "mergeInto.mode": "string",
    },
    required: ["question", "mergeInto.questionId", "mergeInto.mode"],
    enums: { "mergeInto.mode": mergeModes },
  },
  add_questions_batch: {
    args: {
      questions: "array", "questions[]": "object", "questions[].question": "string",
      "questions[].answer": "string", "questions[].tags": "array", "questions[].tags[]": "string",
      "questions[].notSameAs": "array", "questions[].notSameAs[]": "string",
      "questions[].mergeInto": "object", "questions[].mergeInto.questionId": "string",
      "questions[].mergeInto.mode": "string",
    },
    required: [
      "questions", "questions[].question", "questions[].mergeInto.questionId", "questions[].mergeInto.mode",
    ],
    enums: { "questions[].mergeInto.mode": mergeModes },
  },
  save_match_result: {
    args: { jobId: "string", resumeId: "string", matchText: "string" },
    required: ["jobId", "matchText"], enums: {},
  },
  add_jobs_batch: {
    args: {
      jobs: "array", "jobs[]": "object", "jobs[].company": "string", "jobs[].jobTitle": "string",
      "jobs[].jobDescription": "string", "jobs[].location": "string", "jobs[].source": "string",
      "jobs[].jobType": "string", "jobs[].workplaceType": "string", "jobs[].status": "string",
      "jobs[].dueDate": "string", "jobs[].applied": "boolean", "jobs[].appliedDate": "string",
      "jobs[].jobUrl": "string", "jobs[].salaryRange": "string", "jobs[].tags": "array",
      "jobs[].tags[]": "string", "jobs[].allowDuplicate": "boolean", "jobs[].upsert": "boolean",
    },
    required: ["jobs", "jobs[].company", "jobs[].jobTitle", "jobs[].jobDescription"],
    enums: { "jobs[].workplaceType": workplaces, "jobs[].status": statuses },
  },
  save_match_results_batch: {
    args: {
      results: "array", "results[]": "object", "results[].jobId": "string",
      "results[].resumeId": "string", "results[].matchText": "string",
    },
    required: ["results", "results[].jobId", "results[].matchText"], enums: {},
  },
  review_resume: { args: {}, required: [], enums: {} },
  save_resume_review: {
    args: { resumeId: "string", reviewText: "string" },
    required: ["resumeId", "reviewText"], enums: {},
  },
};
