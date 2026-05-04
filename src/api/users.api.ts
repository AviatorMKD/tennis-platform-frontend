import { apiClient } from './client';
import type { MediaFileDto } from './media.api';

export type MyProfileDto = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  birthYear: number | null;
  gender: string | null;
  experienceLevel: number | null;
  isCoach: boolean;
  role: string;
  completedCount: number;
  cancelledCount: number;
  isActive: boolean;
  createdUtc: string;
  emailVerifiedUtc: string | null;
  lastVerificationEmailSentUtc: string | null;
  lastPasswordResetEmailSentUtc: string | null;
  profileImage: MediaFileDto | null;
};

export type UpdateMyProfileRequest = {
  firstName: string;
  lastName: string;
  phone: string;
  birthYear: number | null;
  gender: string | null;
  experienceLevel: number | null;
};

export type UpdateMyProfileResponse = {
  message: string;
  user: MyProfileDto;
};

export async function getMyProfile(): Promise<MyProfileDto> {
  const response = await apiClient.get<MyProfileDto>('/api/Users/me');
  return response.data;
}

export async function updateMyProfile(
  payload: UpdateMyProfileRequest,
): Promise<UpdateMyProfileResponse> {
  const response = await apiClient.put<UpdateMyProfileResponse>('/api/Users/me', payload);
  return response.data;
}