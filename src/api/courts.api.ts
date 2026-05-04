import { apiClient } from './client';

export type CourtDto = {
  id: number;
  clubId: number;
  name: string;
  surfaceType: string | null;
  isIndoor: boolean;
  indoorCoverType: string | null;
  hasLighting: boolean;
  hasHeating: boolean;
  hasCooling: boolean;
  conditionRating: number | null;
  isActive: boolean;
  sortOrder: number;
  createdUtc: string;
};

export async function getCourts(): Promise<CourtDto[]> {
  const response = await apiClient.get<CourtDto[]>('/api/Courts');
  return response.data;
}

export async function getCourtById(courtId: number): Promise<CourtDto> {
  const response = await apiClient.get<CourtDto>(`/api/Courts/${courtId}`);
  return response.data;
}