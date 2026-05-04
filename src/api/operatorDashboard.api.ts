import { apiClient } from './client';

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
  operatingOpenTime: string;
  operatingCloseTime: string;
  isActive: boolean;
  createdUtc: string;
  courtCount?: number;
};

export type UpdateClubRequest = {
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
  isActive: boolean;
  sortOrder: number;
  createdUtc: string;
};

export type ClubOperatorSummary = {
  id: number;
  clubId: number;
  userId: number;
  isPrimary: boolean;
  createdUtc: string;
};

export type OperatorClubCardDto = {
  club: ClubSummary;
  courts: CourtSummary[];
  operators: ClubOperatorSummary[];
};

export async function getClubs(): Promise<ClubSummary[]> {
  const res = await apiClient.get<ClubSummary[]>('/api/Clubs');
  return res.data;
}

export async function getClubById(clubId: number): Promise<ClubSummary> {
  const res = await apiClient.get<ClubSummary>(`/api/Clubs/${clubId}`);
  return res.data;
}

export async function updateClub(
  clubId: number,
  payload: UpdateClubRequest
): Promise<ClubSummary> {
  const res = await apiClient.put<ClubSummary>(`/api/Clubs/${clubId}`, payload);
  return res.data;
}

export async function getCourts(): Promise<CourtSummary[]> {
  const res = await apiClient.get<CourtSummary[]>('/api/Courts');
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

export async function getMyOperatorClubCards(
  currentUserId: number,
  isSystemAdmin: boolean
): Promise<OperatorClubCardDto[]> {
  const [clubs, courts] = await Promise.all([getClubs(), getCourts()]);

  const results = await Promise.all(
    clubs.map(async (club) => {
      try {
        const operators = await getClubOperatorsByClubId(club.id);

        const isAssignedOperator = operators.some(
          (operator) => operator.userId === currentUserId
        );

        if (!isSystemAdmin && !isAssignedOperator) {
          return null;
        }

        return {
          club,
          courts: courts
            .filter((court) => court.clubId === club.id)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
          operators,
        } satisfies OperatorClubCardDto;
      } catch {
        return null;
      }
    })
  );

  return results
    .filter((item): item is OperatorClubCardDto => item !== null)
    .sort((a, b) => {
      const aName = (a.club.name ?? '').toLowerCase();
      const bName = (b.club.name ?? '').toLowerCase();
      return aName.localeCompare(bName);
    });
}