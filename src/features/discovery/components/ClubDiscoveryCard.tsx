import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { ClubCourtSummaryDto, ClubDto, ClubMediaDto } from '../../../api/clubs.api';
import type {
  ClubAvailabilityResultDto,
  CourtAvailabilitySummaryDto,
} from '../../../api/discovery.api';
import { buildDiscoveryQueryString } from '../utils/discoveryTime';

type ClubDiscoveryCardProps = {
  club: ClubDto;
  availabilityResult?: ClubAvailabilityResultDto;
  searchContext?: {
    date: string;
    startLocalTime?: string;
    durationMinutes?: number;
    surfaceType?: string;
    isIndoor?: boolean;
  };
};

type SurfaceKey = 'clay' | 'hard' | 'grass';

type SurfacePreviewItem = {
  key: SurfaceKey;
  label: string;
  uniqueKey: string;
};

const FALLBACK_HERO_IMAGE = '/media/clubs/fallback.jpg';

const SURFACE_ICON_MAP: Record<SurfaceKey, string> = {
  clay: '/media/court-types/clay.png',
  hard: '/media/court-types/hard.png',
  grass: '/media/court-types/grass.png',
};

const ACTION_AREA_HEIGHT = 76;
const HERO_SHIFT = 18;

function getClubHeroImagePath(clubId: number): string {
  return `/media/clubs/club-${clubId}.jpg`;
}

function isVideoMedia(item: ClubMediaDto) {
  const url = item.url.toLowerCase().split('?')[0];

  return (
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.ogg') ||
    url.endsWith('.mov') ||
    url.includes('/video/')
  );
}

function getHeroMedia(club: ClubDto): ClubMediaDto | null {
  return (
    (club.media ?? [])
      .filter((item) => item.usageType?.toLowerCase() === 'hero')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    (club.media ?? [])
      .filter((item) => item.usageType?.toLowerCase() === 'gallery')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    null
  );
}

function mapSurfaceTypeToSurfaceKey(surfaceType: string | null | undefined): SurfaceKey | null {
  if (!surfaceType) {
    return null;
  }

  const normalized = surfaceType.trim().toLowerCase();

  if (normalized === 'clay') {
    return 'clay';
  }

  if (
    normalized === 'hard' ||
    normalized === 'acrylic' ||
    normalized === 'carpet' ||
    normalized === 'synthetic'
  ) {
    return 'hard';
  }

  if (
    normalized === 'grass' ||
    normalized === 'artificial grass' ||
    normalized === 'artificialgrass'
  ) {
    return 'grass';
  }

  return null;
}

function buildDefaultSurfacePreview(courts: ClubCourtSummaryDto[]): SurfacePreviewItem[] {
  return [...courts]
    .filter((court) => court.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.courtId - b.courtId)
    .map((court) => {
      const key = mapSurfaceTypeToSurfaceKey(court.surfaceType);

      if (!key) {
        return null;
      }

      return {
        key,
        label: court.surfaceType,
        uniqueKey: `club-court-${court.courtId}`,
      };
    })
    .filter((item): item is SurfacePreviewItem => item !== null);
}

function buildSearchSurfacePreview(
  matchingCourts: CourtAvailabilitySummaryDto[]
): SurfacePreviewItem[] {
  return matchingCourts
    .map((court) => {
      const key = mapSurfaceTypeToSurfaceKey(court.surfaceType);

      if (!key) {
        return null;
      }

      return {
        key,
        label: court.surfaceType ?? key.toUpperCase(),
        uniqueKey: `matching-court-${court.courtId}`,
      };
    })
    .filter((item): item is SurfacePreviewItem => item !== null);
}

export function ClubDiscoveryCard({
  club,
  availabilityResult,
  searchContext,
}: ClubDiscoveryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isTouchLike = useMediaQuery('(hover: none), (pointer: coarse)');

  const [isHovered, setIsHovered] = useState(false);
  const [fallbackImageSrc, setFallbackImageSrc] = useState(getClubHeroImagePath(club.id));

  const heroMedia = useMemo(() => getHeroMedia(club), [club]);
  const showAction = isTouchLike || isHovered;
  const isSearchMode = !!availabilityResult;

  const locationText =
    [club.city, club.country].filter(Boolean).join(', ') ||
    t('home.clubCard.locationNotSpecified');

  const handleOpen = () => {
    const query = searchContext ? buildDiscoveryQueryString(searchContext) : '';
    void navigate(`/discover/clubs/${club.id}${query ? `?${query}` : ''}`);
  };

  const totalCourtCount = club.courtCount ?? club.courts?.length ?? 0;
  const activeCourtCount = useMemo(
    () => (club.courts ?? []).filter((court) => court.isActive).length,
    [club.courts]
  );

  const previewCourtCount = isSearchMode
    ? availabilityResult.matchingCourtCount
    : totalCourtCount > 0
      ? totalCourtCount
      : activeCourtCount;

  const surfacePreview = useMemo(() => {
    if (isSearchMode) {
      return buildSearchSurfacePreview(availabilityResult.matchingCourts);
    }

    return buildDefaultSurfacePreview(club.courts ?? []);
  }, [availabilityResult, club.courts, isSearchMode]);

  const surfaceLabels = useMemo(
    () => surfacePreview.map((surface) => surface.label),
    [surfacePreview]
  );

  const courtCountLabel = isSearchMode
    ? t('home.clubCard.availableCount', { count: previewCourtCount })
    : previewCourtCount > 0
      ? t('home.clubCard.courtCount', { count: previewCourtCount })
      : t('home.clubCard.courtsTbd');

  return (
    <Card
      onClick={handleOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        width: { xs: 280, sm: 350 },
        minWidth: { xs: 280, sm: 350 },
        maxWidth: { xs: 280, sm: 350 },
        borderRadius: 4,
        overflow: 'hidden',
        flexShrink: 0,
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 180ms ease, box-shadow 220ms ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0px 18px 36px rgba(0,0,0,0.22)' : theme.shadows[4],
      }}
    >
      <Box
        sx={{
          height: 200,
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, rgba(46,125,50,0.95) 0%, rgba(102,187,106,0.9) 100%)',
          transition: 'transform 220ms ease',
          transform: showAction ? `translateY(-${HERO_SHIFT}px)` : 'translateY(0)',
        }}
      >
        {heroMedia ? (
          isVideoMedia(heroMedia) ? (
            <Box
              component="video"
              src={heroMedia.url}
              autoPlay
              muted
              loop
              playsInline
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 320ms ease',
                transform: isHovered ? 'scale(1.06)' : 'scale(1)',
              }}
            />
          ) : (
            <Box
              component="img"
              src={heroMedia.url}
              alt={club.name}
              onError={() => {
                setFallbackImageSrc(FALLBACK_HERO_IMAGE);
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 320ms ease',
                transform: isHovered ? 'scale(1.06)' : 'scale(1)',
              }}
            />
          )
        ) : (
          <Box
            component="img"
            src={fallbackImageSrc}
            alt={club.name}
            onError={() => {
              if (fallbackImageSrc !== FALLBACK_HERO_IMAGE) {
                setFallbackImageSrc(FALLBACK_HERO_IMAGE);
              }
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 320ms ease',
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        )}

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(14,38,17,0.25) 0%, rgba(14,38,17,0.55) 100%)',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0, rgba(255,255,255,0) 28%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.20) 0, rgba(255,255,255,0) 22%)',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            right: 24,
            top: 24,
            width: 76,
            height: 76,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.16)',
            border: '2px solid rgba(255,255,255,0.32)',
            backdropFilter: 'blur(4px)',
            transition: 'transform 220ms ease, opacity 220ms ease',
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            opacity: isHovered ? 0.95 : 1,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 24,
            color: 'common.white',
            transition: 'transform 220ms ease',
            transform: showAction ? 'translateY(-8px)' : 'translateY(0)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {club.name}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
            <LocationOnOutlinedIcon fontSize="small" />
            <Typography variant="body2">{locationText}</Typography>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'relative',
          minHeight: 240,
          overflow: 'hidden',
        }}
      >
        <CardContent
          sx={{
            p: 2.5,
            pb: 2.5,
            transition: 'transform 220ms ease',
            transform: showAction ? `translateY(-${ACTION_AREA_HEIGHT}px)` : 'translateY(0)',
          }}
        >
          <Stack spacing={2}>
            {club.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              minHeight: 55,
              lineHeight: 1.36,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {club.description.replace(/<[^>]+>/g, '')}
          </Typography>
        )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 999,
                  bgcolor: 'rgba(46,125,50,0.08)',
                  border: '1px solid rgba(46,125,50,0.18)',
                }}
              >
                <SportsTennisIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {courtCountLabel}
                </Typography>

                <Stack direction="row" spacing={0.5}>
                  {surfacePreview.map((surface) => (
                    <Box
                      key={surface.uniqueKey}
                      component="img"
                      src={SURFACE_ICON_MAP[surface.key]}
                      alt={surface.label}
                      title={surface.label}
                      sx={{
                        width: 20,
                        height: 30,
                        objectFit: 'contain',
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {availabilityResult && (
                <Chip
                  size="small"
                  label={t('home.clubCard.matchingCount', {
                    count: availabilityResult.matchingCourtCount,
                  })}
                />
              )}

              {availabilityResult?.minPrice != null && (
                <Chip
                  size="small"
                  label={t('home.clubCard.fromPrice', {
                    price: availabilityResult.minPrice,
                    currency: availabilityResult.currency ?? '',
                  }).trim()}
                  variant="outlined"
                />
              )}
            </Stack>

            {surfaceLabels.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {surfaceLabels.join(' • ')}
              </Typography>
            )}

            <Typography variant="body2">
              <strong>{t('home.clubCard.address')}:</strong>{' '}
              {club.addressLine1 || t('home.clubCard.notSpecified')}
            </Typography>

            <Typography variant="body2">
              <strong>{t('home.clubCard.phone')}:</strong>{' '}
              {club.phone || t('home.clubCard.notSpecified')}
            </Typography>
          </Stack>
        </CardContent>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: ACTION_AREA_HEIGHT,
            px: 2.5,
            pb: 2.5,
            display: 'flex',
            alignItems: 'flex-end',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.92) 30%, rgba(255,255,255,1) 100%)',
            opacity: showAction ? 1 : 0,
            transform: showAction ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 220ms ease, transform 220ms ease',
            pointerEvents: showAction ? 'auto' : 'none',
          }}
        >
          <Button
            variant="contained"
            fullWidth
            onClick={(event) => {
              event.stopPropagation();
              handleOpen();
            }}
            endIcon={<ArrowForwardIcon />}
            sx={{
              minHeight: 48,
              fontWeight: 700,
            }}
          >
            {t('home.clubCard.viewClub')}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}