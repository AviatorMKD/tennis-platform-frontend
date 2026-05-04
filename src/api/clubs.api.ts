import { apiClient } from './client';

export type ClubCourtSummaryDto = {
  courtId: number;
  name: string;
  surfaceType: string;
  isActive: boolean;
  sortOrder: number;
};

export type ClubMediaDto = {
  id: number;
  url: string;
  usageType: string;
  sortOrder: number;
};

export type ClubDto = {
  id: number;
  name: string;
  description: string | null;
  phone: string;
  secondaryPhone: string | null;
  addressLine1: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  pointOfContactName: string | null;
  logoMediaFileId: number | null;
  playerRequirementCutoffHours: number | null;

  operatingOpenTime: string;
  operatingCloseTime: string;

  isActive: boolean;
  createdUtc: string;
  courtCount: number;
  courts: ClubCourtSummaryDto[];

  media: ClubMediaDto[];
};

export async function getClubs(): Promise<ClubDto[]> {
  const response = await apiClient.get<ClubDto[]>('/api/Clubs');
  return response.data;
}

export async function getClubById(clubId: number): Promise<ClubDto> {
  const response = await apiClient.get<ClubDto>(`/api/Clubs/${clubId}`);
  return response.data;
}