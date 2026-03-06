export interface Note {
  id: string;
  jobId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteResponse extends Note {
  isEdited: boolean;
}
