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

export type QuestionListItem = Question & { askedCount: number };

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

// canReplace describes the target under the caller's origin policy
export type HeldCandidate = QuestionCandidate & { canReplace: boolean };

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
  | ({ status: "merged"; mode: QuestionMergeMode; savedQuestion: string; hadAnswer: boolean } & QuestionTagReport)
  | { status: "skipped"; existing: { question: string } }
  | { status: "exists"; existing: { id: string; question: string; hasAnswer: boolean; canReplace: boolean } }
  | { status: "similar"; candidates: HeldCandidate[]; hasIncomingAnswer: boolean }
  | { status: "repeat"; of: number }
  // userFacing marks an error written for the user; others address the model
  | { status: "invalid"; error: string; appendOnly?: true; userFacing?: true }
  | { status: "failed"; error: string }
);

export type SaveQuestionsOptions = {
  createdVia: string;
  replaceAgentCreatedOnly: boolean;
  onStep?: (step: "duplicate" | "save") => void;
};
