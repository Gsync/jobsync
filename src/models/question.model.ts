import { Tag } from "./job.model";

export interface Question {
  id: string;
  question: string;
  answer?: string | null;
  createdBy: string;
  tags: Tag[];
  createdAt: Date;
  updatedAt: Date;
}
