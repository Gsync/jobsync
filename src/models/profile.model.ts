export interface Resume {
  id?: string;
  profileId?: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  ContactInfo?: ContactInfo;
}

export interface ContactInfo {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
  resumeId: string;
  firstName: string;
  lastName: string;
  headline: string;
  email?: string;
  phone?: string;
  address?: string;
}
