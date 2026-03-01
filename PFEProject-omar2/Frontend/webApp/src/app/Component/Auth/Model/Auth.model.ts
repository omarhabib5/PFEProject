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

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateProfileImageRequest {
  imageUrl: string;
}

export interface AuthResponse {
  id?: string;
  userId?: number;
  firstName: string;
  lastName: string;
  email: string;
  userName?: string;
  role: string;
  roleDisplayName?: string;
  profileImageUrl?: string;
  token?: string;
  accessToken?: string;
  refreshToken: string;
  tokenExpiry?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  isEmailConfirmed?: boolean;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  role: string;
  roleDisplayName: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  isEmailConfirmed: boolean;
}