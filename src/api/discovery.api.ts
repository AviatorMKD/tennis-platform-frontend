import { apiClient } from './client';

export type MediaItemDto = {
  id: number;
  url: string;
  usageType: string;
  sortOrder: number;
};

export type ClubHeroDto = {
  clubId: number;
  clubName: string | null;
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
  operatingOpenTime: string;
  operatingCloseTime: string;
  isActive: boolean;
  media: MediaItemDto[];
};

export type CourtAvailabilitySummaryDto = {
  courtId: number;
  courtName: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  hasLighting: boolean;
  isAvailable: boolean;
  price: number | null;
  currency: string | null;
};

export type CourtAvailabilityDetailDto = {
  courtId: number;
  courtName: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  indoorCoverType: string | null;
  hasLighting: boolean;
  hasHeating: boolean;
  hasCooling: boolean;
  conditionRating: number | null;
  isActive: boolean;
  sortOrder: number;
  isAvailable: boolean;
  price: number | null;
  currency: string | null;
  unavailableReason: string | null;
  allowedDurations: string | null;
};

export type ClubTimeSlotDto = {
  startLocalTime: string;
  availableCourtCount: number;
};

export type ClubBookingDiscoveryDto = {
  club: ClubHeroDto;
  date: string;
  clubBaseSlotMinutes: number;
  suggestedDurations: number[];
  availableStartTimes: string[];
  timeGridSlots: ClubTimeSlotDto[];
  courts: CourtAvailabilityDetailDto[];
};

export type ClubTimeGridDto = {
  clubId: number;
  date: string;
  clubBaseSlotMinutes: number;
  slots: ClubTimeSlotDto[];
};

export type ClubAvailabilityResultDto = {
  clubId: number;
  clubName: string | null;
  city: string | null;
  country: string | null;
  addressLine1: string | null;
  phone: string | null;
  isActive: boolean;
  matchingCourtCount: number;
  clubBaseSlotMinutes: number;
  minPrice: number | null;
  currency: string | null;
  matchingCourts: CourtAvailabilitySummaryDto[];
};

export type ClubAvailabilitySearchDto = {
  date: string;
  startLocalTime: string;
  durationMinutes: number;
  clubs: ClubAvailabilityResultDto[];
};

export type ClubDayOccupancyCourtDto = {
  courtId: number;
  courtName: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type ClubDayOccupancyBookingDto = {
  bookingId: number;
  courtId: number;
  courtName: string | null;
  startUtc: string;
  endUtc: string;
  status: string;
  ownerUserId: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  bookedPrice: number;
  currency: string;
  notes: string | null;
};

export type ClubDayOccupancyBlockDto = {
  blockId: number;
  courtId: number;
  courtName: string | null;
  startUtc: string;
  endUtc: string;
  notes: string | null;
  createdByUserId: number;
  createdUtc: string;
};

export type ClubDayOccupancyDto = {
  clubId: number;
  date: string;
  slotMinutes: number;
  courts: ClubDayOccupancyCourtDto[];
  bookings: ClubDayOccupancyBookingDto[];
  blocks: ClubDayOccupancyBlockDto[];
};

export type ClubWeatherHourDto = {
    localTime: string;
    hour: number;
    tempC: number;
    conditionText: string;
    conditionCode: number;
    iconUrl: string;
    cloud: number;
    chanceOfRain: number;
    precipMm: number;
    windKph: number;
    gustKph: number;
    windDir: string;
    isDay: boolean;
};

export type ClubWeatherTimelineDto = {
    clubId: number;
    date: string;
    timeZoneId: string;
    hours: ClubWeatherHourDto[];
};

export type GetClubWeatherTimelineParams = {
    date: string;
};

export type GetClubBookingDiscoveryParams = {
  date: string;
  startLocalTime?: string;
  durationMinutes?: number;
  surfaceType?: string;
  isIndoor?: boolean;
};

export type GetClubTimeGridParams = {
  date: string;
};

export type SearchClubAvailabilityParams = {
  city?: string;
  clubId?: number;
  date: string;
  startLocalTime: string;
  durationMinutes: number;
  surfaceType?: string;
  isIndoor?: boolean;
};

export type GetClubDayOccupancyParams = {
  date: string;
};

export async function getClubBookingDiscovery(
  clubId: number,
  params: GetClubBookingDiscoveryParams
): Promise<ClubBookingDiscoveryDto> {
  const response = await apiClient.get<ClubBookingDiscoveryDto>(
    `/api/Discovery/clubs/${clubId}/booking`,
    { params }
  );

  return response.data;
}

export async function getClubTimeGrid(
  clubId: number,
  params: GetClubTimeGridParams
): Promise<ClubTimeGridDto> {
  const response = await apiClient.get<ClubTimeGridDto>(
    `/api/Discovery/clubs/${clubId}/time-grid`,
    { params }
  );

  return response.data;
}

export async function searchClubAvailability(
  params: SearchClubAvailabilityParams
): Promise<ClubAvailabilitySearchDto> {
  const response = await apiClient.get<ClubAvailabilitySearchDto>(
    '/api/Discovery/clubs/availability',
    { params }
  );

  return response.data;
}

export async function getClubDayOccupancy(
  clubId: number,
  params: GetClubDayOccupancyParams
): Promise<ClubDayOccupancyDto> {
  const response = await apiClient.get<ClubDayOccupancyDto>(
    `/api/Discovery/clubs/${clubId}/day-occupancy`,
    { params }
  );

  return response.data;
}

export async function getClubWeatherTimeline(
    clubId: number,
    params: GetClubWeatherTimelineParams
): Promise<ClubWeatherTimelineDto> {
    const response = await apiClient.get<ClubWeatherTimelineDto>(
        `/api/Weather/clubs/${clubId}/timeline`,
        { params }
    );

    return response.data;
}