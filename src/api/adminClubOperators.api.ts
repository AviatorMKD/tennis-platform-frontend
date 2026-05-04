import { apiClient } from './client';

export type AdminUserSummary = {
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

export type ClubSummary = {
  id: number;
  name: string | null;
  description: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  pointOfContactName: string | null;
  logoMediaFileId: number | null;
  playerRequirementCutoffHours: number | null;
  isActive: boolean;
  createdUtc: string;
};

export type ClubOperatorSummary = {
  id: number;
  clubId: number;
  userId: number;
  isPrimary: boolean;
  createdUtc: string;
};

export type CreateClubOperatorRequest = {
  clubId: number;
  userId: number;
  isPrimary: boolean;
};

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const res = await apiClient.get<AdminUserSummary[]>('/api/admin/users');
  return res.data;
}

export async function getClubs(): Promise<ClubSummary[]> {
  const res = await apiClient.get<ClubSummary[]>('/api/Clubs');
  return res.data;
}

export async function getClubOperatorsByClubId(
  clubId: number
): Promise<ClubOperatorSummary[]> {
  const res = await apiClient.get<ClubOperatorSummary[]>(
    `/api/ClubOperators/by-club/${clubId}`
  );
  return res.data;
}

export async function createClubOperator(
  payload: CreateClubOperatorRequest
): Promise<ClubOperatorSummary> {
  const res = await apiClient.post<ClubOperatorSummary>(
    '/api/ClubOperators',
    payload
  );
  return res.data;
}

export async function removeClubOperator(
  id: number
): Promise<{ message?: string }> {
  const res = await apiClient.delete<{ message?: string }>(
    `/api/ClubOperators/remove/${id}`
  );
  return res.data;
}