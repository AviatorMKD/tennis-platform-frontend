import { apiClient } from './client';

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
  bookingGapPolicy: string | null;
  isActive: boolean;
  sortOrder: number;
  createdUtc: string;
};

export type CourtScheduleRuleDto = {
  id: number;
  courtId: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  baseSlotMinutes: number;
  allowedDurations: string | null;
  isActive: boolean;
};

export type CourtPriceRuleDto = {
  id: number;
  courtId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  currency: string | null;
  isActive: boolean;
  createdUtc: string;
};

export type CourtBlockDto = {
  id: number;
  courtId: number;
  startUtc: string;
  endUtc: string;
  reason: string | null;
  createdByUserId: number;
  createdUtc: string;
};

export type CreateCourtScheduleRuleRequest = {
  courtId: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  baseSlotMinutes: number;
  allowedDurations: string | null;
};

export type UpdateCourtScheduleRuleRequest = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  baseSlotMinutes: number;
  allowedDurations: string | null;
  isActive: boolean;
};

export type CreateCourtPriceRuleRequest = {
  courtId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  currency: string | null;
};

export type UpdateCourtPriceRuleRequest = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  currency: string | null;
  isActive: boolean;
};

export type CreateCourtBlockRequest = {
  courtId: number;
  startUtc: string;
  endUtc: string;
  reason: string | null;
};

export type UpdateCourtBlockRequest = {
  startUtc: string;
  endUtc: string;
  reason: string | null;
};

export async function getCourtById(courtId: number): Promise<CourtSummary> {
  const res = await apiClient.get<CourtSummary>(`/api/Courts/${courtId}`);
  return res.data;
}

export async function getScheduleRulesByCourtId(
  courtId: number
): Promise<CourtScheduleRuleDto[]> {
  const res = await apiClient.get<CourtScheduleRuleDto[]>(
    `/api/CourtScheduleRules/by-court/${courtId}`
  );
  return res.data;
}

export async function createScheduleRule(
  payload: CreateCourtScheduleRuleRequest
): Promise<CourtScheduleRuleDto> {
  const res = await apiClient.post<CourtScheduleRuleDto>(
    '/api/CourtScheduleRules',
    payload
  );
  return res.data;
}

export async function updateScheduleRule(
  id: number,
  payload: UpdateCourtScheduleRuleRequest
): Promise<CourtScheduleRuleDto> {
  const res = await apiClient.put<CourtScheduleRuleDto>(
    `/api/CourtScheduleRules/${id}`,
    payload
  );
  return res.data;
}

export async function deleteScheduleRule(id: number): Promise<void> {
  await apiClient.delete(`/api/CourtScheduleRules/${id}`);
}

export async function getPriceRulesByCourtId(
  courtId: number
): Promise<CourtPriceRuleDto[]> {
  const res = await apiClient.get<CourtPriceRuleDto[]>(
    `/api/CourtPriceRules/by-court/${courtId}`
  );
  return res.data;
}

export async function createPriceRule(
  payload: CreateCourtPriceRuleRequest
): Promise<CourtPriceRuleDto> {
  const res = await apiClient.post<CourtPriceRuleDto>(
    '/api/CourtPriceRules',
    payload
  );
  return res.data;
}

export async function updatePriceRule(
  id: number,
  payload: UpdateCourtPriceRuleRequest
): Promise<CourtPriceRuleDto> {
  const res = await apiClient.put<CourtPriceRuleDto>(
    `/api/CourtPriceRules/${id}`,
    payload
  );
  return res.data;
}

export async function deletePriceRule(id: number): Promise<void> {
  await apiClient.delete(`/api/CourtPriceRules/${id}`);
}

export async function getBlocksByCourtId(
  courtId: number
): Promise<CourtBlockDto[]> {
  const res = await apiClient.get<CourtBlockDto[]>(
    `/api/CourtBlocks/by-court/${courtId}`
  );
  return res.data;
}

export async function createBlock(
  payload: CreateCourtBlockRequest
): Promise<CourtBlockDto> {
  const res = await apiClient.post<CourtBlockDto>('/api/CourtBlocks', payload);
  return res.data;
}

export async function updateBlock(
  id: number,
  payload: UpdateCourtBlockRequest
): Promise<CourtBlockDto> {
  const res = await apiClient.put<CourtBlockDto>(
    `/api/CourtBlocks/${id}`,
    payload
  );
  return res.data;
}

export async function deleteBlock(id: number): Promise<void> {
  await apiClient.delete(`/api/CourtBlocks/${id}`);
}