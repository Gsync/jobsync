export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
};
