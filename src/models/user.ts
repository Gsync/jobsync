export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

export type SessionUser = {
  name: string;
  email: string;
};
