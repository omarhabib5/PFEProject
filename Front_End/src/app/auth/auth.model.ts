export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export enum UserRole {
  ProdectOwner = 1,
  ScrumMaster = 2,
  Developer = 3,
  Tester = 4,
  Observer = 5
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
    role?: string;
  };
}
