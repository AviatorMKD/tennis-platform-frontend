import { apiClient } from './client';

export type AdminUserDto = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  birthYear: number | null;
  gender: string | null;
  experienceLevel: number | null;
  isCoach: boolean;
  role: string | null;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  isActive: boolean;
  createdUtc: string;
  emailVerifiedUtc: string | null;
  lastVerificationEmailSentUtc: string | null;
  lastPasswordResetEmailSentUtc: string | null;
};

export type UpdateAdminUserRequest = {
  firstName: string;
  lastName: string;
  phone: string;
  birthYear: number | null;
  gender: string | null;
  experienceLevel: number | null;
  isCoach: boolean;
  role: string;
  isActive: boolean;
};

export type UpdateAdminUserResponse = {
  message: string;
  user: AdminUserDto;
};

export async function getAdminUsers(): Promise<AdminUserDto[]> {
  const res = await apiClient.get<AdminUserDto[]>('/api/admin/users');
  return res.data;
}

export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserRequest
): Promise<UpdateAdminUserResponse> {
  const res = await apiClient.put<UpdateAdminUserResponse>(
    `/api/admin/users/${id}`,
    payload
  );
  return res.data;
}