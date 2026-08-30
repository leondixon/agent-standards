export interface CreateUser {
  email: string;
  dateOfBirth?: Date | null;
}

export function accept(params: CreateUser) {
  return params;
}
