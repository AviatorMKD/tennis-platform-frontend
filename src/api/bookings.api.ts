import { apiClient } from './client';

export type BookingParticipantDto = {
  id: number;
  bookingId: number;
  userId: number | null;
  displayName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  participantType: string | null;
  participationStatus: string | null;
  experienceLevelSnapshot: number | null;
  joinedUtc: string | null;
  respondedUtc: string | null;
  createdUtc: string;
};

export type BookingInvitationDto = {
  id: number;
  bookingId: number;
  invitedUserId: number;
  invitationType: string | null;
  invitationChannel: string | null;
  invitationStatus: string | null;
  requiredForConfirmation: boolean;
  sentUtc: string;
  respondedUtc: string | null;
  responseNotes: string | null;
  createdUtc: string;
};

export type BookingDto = {
  id: number;
  courtId: number;
  clubId: number;
  courtName: string | null;
  clubName: string | null;
  surfaceType: string | null;
  playerUserId: number;
  startUtc: string;
  endUtc: string;
  status: string | null;
  bookedPrice: number;
  currency: string | null;
  needsAdditionalPlayers: boolean;
  minimumPlayersRequired: number;
  maximumPlayersAllowed: number;
  confirmedPlayersCount: number;
  playerRequirementDeadlineUtc: string | null;
  autoCancelIfPlayerRequirementNotMet: boolean;
  partnerCostSharing: boolean;
  notes: string | null;
  createdUtc: string;
  cancelledUtc: string | null;
  cancelledByUserId: number | null;
  participants: BookingParticipantDto[];
  invitations: BookingInvitationDto[];
};

export type CreateBookingRequest = {
  courtId: number;
  startUtc: string;
  endUtc: string;
  bookedPrice: number;
  currency: string | null;
  needsAdditionalPlayers: boolean;
  minimumPlayersRequired: number;
  maximumPlayersAllowed: number;
  playerRequirementDeadlineUtc: string | null;
  autoCancelIfPlayerRequirementNotMet: boolean;
  partnerCostSharing: boolean;
  minimumExperienceLevel: number | null;
  maximumExperienceLevel: number | null;
  autoInviteMatchingPlayers: boolean;
  notes: string | null;
};

export type BookingInvitationCandidateCountRequest = {
  minimumExperienceLevel: number;
  maximumExperienceLevel: number;
};

export type BookingInvitationCandidateCountResponse = {
  count: number;
};

export async function createBooking(payload: CreateBookingRequest): Promise<BookingDto> {
  const response = await apiClient.post<BookingDto>('/api/Bookings', payload);
  return response.data;
}

export async function cancelBooking(bookingId: number): Promise<BookingDto> {
  const response = await apiClient.post<BookingDto>(`/api/Bookings/${bookingId}/cancel`);
  return response.data;
}

export async function getBookingsByCourt(courtId: number): Promise<BookingDto[]> {
  const response = await apiClient.get<BookingDto[]>(`/api/Bookings/by-court/${courtId}`);
  return response.data;
}

export async function getMyBookings(): Promise<BookingDto[]> {
  const response = await apiClient.get<BookingDto[]>('/api/Bookings/my');
  return response.data;
}

export async function getMyPendingInvitations(): Promise<BookingDto[]> {
  const response = await apiClient.get<BookingDto[]>('/api/Bookings/my-pending-invitations');
  return response.data;
}

export async function acceptBookingInvitation(bookingId: number): Promise<BookingDto> {
  const response = await apiClient.post<BookingDto>(`/api/Bookings/${bookingId}/accept-invitation`);
  return response.data;
}

export async function getInvitationCandidateCount(
  payload: BookingInvitationCandidateCountRequest
): Promise<BookingInvitationCandidateCountResponse> {
  const response = await apiClient.post<BookingInvitationCandidateCountResponse>(
    '/api/Bookings/candidate-count',
    payload
  );
  return response.data;
}

export async function getBookingById(bookingId: number): Promise<BookingDto> {
  const response = await apiClient.get<BookingDto>(`/api/Bookings/${bookingId}`);
  return response.data;
}