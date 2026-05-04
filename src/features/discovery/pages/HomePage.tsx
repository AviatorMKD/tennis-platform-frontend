import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import { Box, Container, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getClubs, type ClubDto } from '../../../api/clubs.api';
import {
  searchClubAvailability,
  type ClubAvailabilitySearchDto,
} from '../../../api/discovery.api';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';
import { ClubDiscoveryCard } from '../components/ClubDiscoveryCard';
import { QuickAvailabilitySearchBar } from '../components/QuickAvailabilitySearchBar';
import { getRoundedTimeString, getTodayIsoDate } from '../utils/discoveryTime';

type SearchState = {
  city: string;
  date: string;
  startLocalTime: string;
  durationMinutes: number;
  surfaceType: string;
  isIndoor: '' | 'true' | 'false';
};

const initialSearchState: SearchState = {
  city: '',
  date: getTodayIsoDate(),
  startLocalTime: getRoundedTimeString(30),
  durationMinutes: 60,
  surfaceType: '',
  isIndoor: '',
};

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.slice(0, 5);

  if (normalized === '24:00') {
    return 24 * 60;
  }

  const [hourText, minuteText] = normalized.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesToTime(value: number) {
  const normalized = Math.max(0, Math.min(24 * 60, value));

  if (normalized === 24 * 60) {
    return '24:00';
  }

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

export function HomePage() {
  const { t } = useTranslation();

  const [searchState, setSearchState] = useState<SearchState>(initialSearchState);
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: getClubs,
  });

  const discoveryQuery = useQuery({
    queryKey: ['club-availability-search', searchState],
    queryFn: async (): Promise<ClubAvailabilitySearchDto> =>
      searchClubAvailability({
        city: searchState.city || undefined,
        date: searchState.date,
        startLocalTime: searchState.startLocalTime,
        durationMinutes: searchState.durationMinutes,
        surfaceType: searchState.surfaceType || undefined,
        isIndoor:
          searchState.isIndoor === ''
            ? undefined
            : searchState.isIndoor === 'true',
      }),
    enabled: hasSubmittedSearch,
  });

  const clubs = clubsQuery.data ?? [];

  const globalOperatingWindow = useMemo(() => {
    const activeClubs = clubs.filter((club) => club.isActive);

    const openingTimes = activeClubs
      .map((club) => parseTimeToMinutes(club.operatingOpenTime))
      .filter((value): value is number => value !== null);

    const closingTimes = activeClubs
      .map((club) => parseTimeToMinutes(club.operatingCloseTime))
      .filter((value): value is number => value !== null);

    if (openingTimes.length === 0 || closingTimes.length === 0) {
      return {
        minTime: undefined,
        maxTime: undefined,
      };
    }

    return {
      minTime: formatMinutesToTime(Math.min(...openingTimes)),
      maxTime: formatMinutesToTime(Math.max(...closingTimes)),
    };
  }, [clubs]);

  const availabilityByClubId = useMemo(() => {
    const map = new Map<number, ClubAvailabilitySearchDto['clubs'][number]>();

    for (const item of discoveryQuery.data?.clubs ?? []) {
      map.set(item.clubId, item);
    }

    return map;
  }, [discoveryQuery.data]);

  const featuredClubs: ClubDto[] = useMemo(() => {
    if (!hasSubmittedSearch || !discoveryQuery.data) {
      return clubs;
    }

    const matchingClubIds = new Set(discoveryQuery.data.clubs.map((x) => x.clubId));
    const matchingClubs = clubs.filter((club) => matchingClubIds.has(club.id));

    return matchingClubs.length > 0 ? matchingClubs : clubs;
  }, [clubs, discoveryQuery.data, hasSubmittedSearch]);

  const showNoMatchesMessage =
    hasSubmittedSearch &&
    !discoveryQuery.isLoading &&
    !discoveryQuery.isError &&
    !!discoveryQuery.data &&
    discoveryQuery.data.clubs.length === 0;

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Box
        sx={{
          background:
            'linear-gradient(180deg, rgba(27,94,32,0.92) 0%, rgba(56,142,60,0.86) 100%)',
          color: 'common.white',
          py: { xs: 6, md: 9 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.14) 0, rgba(255,255,255,0) 20%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 16%), radial-gradient(circle at 72% 70%, rgba(255,255,255,0.08) 0, rgba(255,255,255,0) 14%)',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
              gap: 4,
              alignItems: 'start',
            }}
          >
            <Stack spacing={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SportsTennisIcon />
                <Typography variant="overline" sx={{ letterSpacing: 1.5 }}>
                  {t('home.heroKicker')}
                </Typography>
              </Stack>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.05,
                  maxWidth: 760,
                  fontSize: { xs: '2.2rem', md: '3.7rem' },
                }}
              >
                {t('home.heroTitle')}
              </Typography>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 400,
                  lineHeight: 1.05,
                  maxWidth: 760,
                  fontSize: { xs: '2.2rem', md: '3.7rem' },
                }}
              >
                {t('home.heroSubtitle')}
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  maxWidth: 700,
                  color: 'rgba(255,255,255,0.92)',
                  fontWeight: 400,
                  lineHeight: 1.5,
                }}
              >
                {t('home.heroDescription')}
              </Typography>
            </Stack>

            <QuickAvailabilitySearchBar
              initialCity={searchState.city}
              minTime={globalOperatingWindow.minTime}
              maxTime={globalOperatingWindow.maxTime}
              isSubmitting={discoveryQuery.isFetching}
              showWarning={showNoMatchesMessage}
              warningTitle={t('home.noMatchesTitle')}
              warningMessage={t('home.noMatchesMessage')}
              onSearch={(values) => {
                setSearchState(values);
                setHasSubmittedSearch(true);
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          {hasSubmittedSearch && discoveryQuery.isError && (
            <ErrorState message={t('home.searchError')} />
          )}

          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {hasSubmittedSearch
                ? t('home.matchingVenues')
                : t('home.registeredVenues')}
            </Typography>

            <Typography color="text.secondary">
              {t('home.sectionDescription')}
            </Typography>
          </Box>

          {clubsQuery.isLoading && <LoadingScreen />}

          {clubsQuery.isError && <ErrorState message={t('home.loadError')} />}

          {!clubsQuery.isLoading && !clubsQuery.isError && featuredClubs.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                overflowX: 'auto',
                pb: 1,
                scrollSnapType: 'x proximity',
                '& > *': {
                  scrollSnapAlign: 'start',
                },
              }}
            >
              {featuredClubs.map((club) => (
                <ClubDiscoveryCard
                  key={club.id}
                  club={club}
                  availabilityResult={availabilityByClubId.get(club.id)}
                  searchContext={{
                    date: searchState.date,
                    startLocalTime: hasSubmittedSearch
                      ? searchState.startLocalTime
                      : undefined,
                    durationMinutes: hasSubmittedSearch
                      ? searchState.durationMinutes
                      : undefined,
                    surfaceType:
                      hasSubmittedSearch && searchState.surfaceType
                        ? searchState.surfaceType
                        : undefined,
                    isIndoor:
                      hasSubmittedSearch && searchState.isIndoor !== ''
                        ? searchState.isIndoor === 'true'
                        : undefined,
                  }}
                />
              ))}
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}