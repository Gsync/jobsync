import { Tag } from "./job.model";

export interface Question {
  id: string;
  question: string;
  answer?: string | null;
  createdBy: string;
  tags: Tag[];
  createdAt: Date;
  updatedAt: Date;
  createdVia?: string | null;
}

// A saved question as the duplicate check and merges see it
export type BankQuestion = {
  id: string;
  question: string;
  answer: string | null;
  createdVia: string | null;
  tags: { id: string; value: string }[];
};

export type QuestionCandidate = {
  id: string;
  question: string;
  score: number;
  hasAnswer: boolean;
};

// candidateRows is server-side only, for merge targeting
export type QuestionMatch = {
  exact?: BankQuestion;
  candidates: QuestionCandidate[];
  candidateRows: BankQuestion[];
};

export type QuestionMergeMode = "append" | "replace";

export type SaveQuestionInput = {
  question: string;
  answer?: string;
  tags?: string[];
  notSameAs?: string[];
  mergeInto?: { questionId: string; mode: QuestionMergeMode };
};

export type QuestionTagReport = {
  tags: { id: string; label: string; created: boolean }[];
  droppedTags: string[];
};

// index is the 1-based input position; only exists/similar carry question ids
export type SaveQuestionResult = { index: number; question: string } & (
  | ({ status: "saved" } & QuestionTagReport)
  | ({ status: "merged"; mode: QuestionMergeMode } & QuestionTagReport)
  | { status: "skipped"; existing: { question: string } }
  | { status: "exists"; existing: { id: string; question: string; hasAnswer: boolean } }
  | { status: "similar"; candidates: QuestionCandidate[] }
  | { status: "repeat"; of: number }
  | { status: "invalid"; error: string; appendOnly?: true }
  | { status: "failed"; error: string }
);

export type SaveQuestionsOptions = {
  createdVia: string;
  replaceAgentCreatedOnly: boolean;
  onStep?: (step: "duplicate" | "save") => void;
};
