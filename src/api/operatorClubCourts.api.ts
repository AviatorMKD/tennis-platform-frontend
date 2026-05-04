import { apiClient } from './client';

export type BookingGapPolicy = 'Open' | 'Strict';

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

export type CourtSummary = {
  id: number;
  clubId: number;
  name: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  indoorCoverType: string | null;
  hasLighting: boolean;
  hasHeating: boolean;
  hasCooling: boolean;
  conditionRating: number | null;
  bookingGapPolicy: BookingGapPolicy;
  isActive: boolean;
  sortOrder: number;
  createdUtc: string;
};

export type CreateCourtRequest = {
  clubId: number;
  name: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  indoorCoverType: string | null;
  hasLighting: boolean;
  hasHeating: boolean;
  hasCooling: boolean;
  conditionRating: number | null;
  bookingGapPolicy: BookingGapPolicy;
  sortOrder: number;
};

export type UpdateCourtRequest = {
  clubId: number;
  name: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  indoorCoverType: string | null;
  hasLighting: boolean;
  hasHeating: boolean;
  hasCooling: boolean;
  conditionRating: number | null;
  bookingGapPolicy: BookingGapPolicy;
  isActive: boolean;
  sortOrder: number;
};

export async function getClubById(clubId: number): Promise<ClubSummary> {
  const res = await apiClient.get<ClubSummary>(`/api/Clubs/${clubId}`);
  return res.data;
}

export async function getCourts(): Promise<CourtSummary[]> {
  const res = await apiClient.get<CourtSummary[]>('/api/Courts');
  return res.data;
}

export async function createCourt(payload: CreateCourtRequest): Promise<CourtSummary> {
  const res = await apiClient.post<CourtSummary>('/api/Courts', payload);
  return res.data;
}

export async function updateCourt(
  courtId: number,
  payload: UpdateCourtRequest
): Promise<CourtSummary> {
  const res = await apiClient.put<CourtSummary>(`/api/Courts/${courtId}`, payload);
  return res.data;
}

export async function deleteCourt(courtId: number): Promise<void> {
  await apiClient.delete(`/api/Courts/${courtId}`);
}