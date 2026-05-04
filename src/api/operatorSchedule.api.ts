import { apiClient } from './client';

export type OperatorScheduleCourtDto = {
  courtId: number;
  courtName: string | null;
  surfaceType: string | null;
  isIndoor: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type OperatorScheduleBookingDto = {
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
  needsAdditionalPlayers: boolean;
  minimumPlayersRequired: number;
  maximumPlayersAllowed: number;
  confirmedPlayersCount: number;
  partnerCostSharing: boolean;
  notes: string | null;
  createdUtc: string;
};

export type OperatorScheduleBlockDto = {
  blockId: number;
  courtId: number;
  courtName: string | null;
  startUtc: string;
  endUtc: string;
  reason: string | null;
  createdByUserId: number;
  createdUtc: string;
};

export type OperatorScheduleDayDto = {
  clubId: number;
  clubName: string;
  date: string;
  slotMinutes: number;
  operatingOpenTime: string;
  operatingCloseTime: string;
  courts: OperatorScheduleCourtDto[];
  bookings: OperatorScheduleBookingDto[];
  blocks: OperatorScheduleBlockDto[];
};

export async function getOperatorClubDaySchedule(
  clubId: number,
  date: string
): Promise<OperatorScheduleDayDto> {
  const response = await apiClient.get<OperatorScheduleDayDto>(
    `/api/OperatorSchedule/clubs/${clubId}/day`,
    {
      params: { date },
    }
  );

  return response.data;
}