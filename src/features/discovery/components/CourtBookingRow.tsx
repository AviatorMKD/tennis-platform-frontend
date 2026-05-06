import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WbIncandescentIcon from '@mui/icons-material/WbIncandescent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type {
  ClubWeatherHourDto,
  CourtAvailabilityDetailDto,
} from '../../../api/discovery.api';
import { formatLocalShortDate } from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { CourtBookingPanel } from './CourtBookingPanel';
import {
  CourtTimelineSelector,
  type CourtTimelinePreviewRangeState,
  type CourtTimelinePreviewState,
} from './CourtTimelineSelector';
import type { TimeBox } from '../utils/discoveryTime';
import {
  addMinutesToTimeString,
  calculateCourtSelectionPrice,
  formatDisplayRange,
  formatDurationLabel,
  getCourtHeroImagePath,
  getCourtSurfaceSelectionColors,
  getSelectionBounds,
  type CourtPriceRuleLite,
} from '../utils/discoveryTime';

type CourtBookingRowProps = {
  clubId: number;
  date: string;
  inheritedStartLocalTime: string;
  inheritedDurationMinutes: number;
  court: CourtAvailabilityDetailDto;
  timeBoxes: TimeBox[];
  clubOpenMinutes: number;
  clubCloseMinutes: number;
  getEffectiveAvailableCount: (key: string) => number;
  onBookingCreated: () => Promise<void>;
  maxAllowedDurationMinutes?: number;
  allowedDurations?: number[];
  courtPriceRules?: CourtPriceRuleLite[];
  playerRequirementCutoffHours?: number | null;
  weatherHours?: ClubWeatherHourDto[];
};

type SelectionReason = 'overlap' | 'duration_not_allowed' | 'too_long' | null;

export function CourtBookingRow({
  date,
  inheritedStartLocalTime,
  inheritedDurationMinutes,
  court,
  timeBoxes,
  clubOpenMinutes,
  clubCloseMinutes,
  getEffectiveAvailableCount,
  onBookingCreated,
  maxAllowedDurationMinutes,
  allowedDurations,
  courtPriceRules = [],
  playerRequirementCutoffHours,
  weatherHours = [],
}: CourtBookingRowProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState(inheritedStartLocalTime);
  const [selectedEndTime, setSelectedEndTime] = useState(
    addMinutesToTimeString(inheritedStartLocalTime, inheritedDurationMinutes)
  );

  const [previewState, setPreviewState] = useState<CourtTimelinePreviewState>({
    hasActivePreview: false,
    isValid: true,
    reason: null,
  });

  const [previewRangeState, setPreviewRangeState] = useState<CourtTimelinePreviewRangeState>({
    hasActivePreview: false,
    fromKey: inheritedStartLocalTime,
    toKey: addMinutesToTimeString(inheritedStartLocalTime, inheritedDurationMinutes),
    durationMinutes: inheritedDurationMinutes,
  });

  const selectionBounds = useMemo(
    () => getSelectionBounds(selectedStartTime, selectedEndTime),
    [selectedStartTime, selectedEndTime]
  );

  const displayBounds = previewRangeState.hasActivePreview
    ? {
        fromKey: previewRangeState.fromKey,
        toKey: previewRangeState.toKey,
        fromMinutes: getSelectionBounds(previewRangeState.fromKey, previewRangeState.toKey)
          .fromMinutes,
        toMinutes: getSelectionBounds(previewRangeState.fromKey, previewRangeState.toKey)
          .toMinutes,
      }
    : selectionBounds;

  const displayDurationMinutes = previewRangeState.hasActivePreview
    ? previewRangeState.durationMinutes
    : selectionBounds.toMinutes - selectionBounds.fromMinutes;

  const selectedDurationMinutes = selectionBounds.toMinutes - selectionBounds.fromMinutes;
  const surfacePreviewImage = getCourtHeroImagePath(court.surfaceType);
  const selectionColors = getCourtSurfaceSelectionColors(court.surfaceType);

  const localCalculatedPrice = useMemo(() => {
    if (!courtPriceRules.length) {
      return { price: null, currency: null };
    }

    return calculateCourtSelectionPrice({
      date,
      startKey: displayBounds.fromKey,
      endKey: displayBounds.toKey,
      rules: courtPriceRules,
    });
  }, [courtPriceRules, date, displayBounds.fromKey, displayBounds.toKey]);

  const priceLabel =
    localCalculatedPrice.price != null
      ? formatCurrency(localCalculatedPrice.price, localCalculatedPrice.currency)
      : 'Price not defined';

  const committedHasUnavailableOverlap = useMemo(() => {
    return timeBoxes.some((box) => {
      if (
        box.minuteOfDay < selectionBounds.fromMinutes ||
        box.minuteOfDay >= selectionBounds.toMinutes
      ) {
        return false;
      }

      if (box.minuteOfDay >= clubCloseMinutes) {
        return false;
      }

      return getEffectiveAvailableCount(box.key) <= 0;
    });
  }, [
    timeBoxes,
    selectionBounds.fromMinutes,
    selectionBounds.toMinutes,
    clubCloseMinutes,
    getEffectiveAvailableCount,
  ]);

  const committedNotAllowedDuration =
    Array.isArray(allowedDurations) &&
    allowedDurations.length > 0 &&
    !allowedDurations.includes(selectedDurationMinutes);

  const committedExceedsMaxDuration =
    !committedNotAllowedDuration &&
    typeof maxAllowedDurationMinutes === 'number' &&
    maxAllowedDurationMinutes > 0 &&
    selectedDurationMinutes > maxAllowedDurationMinutes;

  const committedReason: SelectionReason = committedHasUnavailableOverlap
    ? 'overlap'
    : committedNotAllowedDuration
      ? 'duration_not_allowed'
      : committedExceedsMaxDuration
        ? 'too_long'
        : null;

  const committedIsAvailable = committedReason === null;

  const effectiveReason: SelectionReason = previewState.hasActivePreview
    ? previewState.reason
    : committedReason;

  const effectiveIsAvailable = previewState.hasActivePreview
    ? previewState.isValid
    : committedIsAvailable;

  const statusLabel = effectiveIsAvailable ? 'Available' : 'Unavailable';

  const statusMessage =
    effectiveReason === 'overlap'
      ? court.unavailableReason || 'Court is not available for the selected time'
      : effectiveReason === 'duration_not_allowed'
        ? 'Selected duration is not allowed for this court'
        : effectiveReason === 'too_long'
          ? 'Selected duration exceeds the maximum allowed'
          : 'Booking slot available';

  const actionButtonLabel = 'View booking options';

  return (
    <Card
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        background:
          'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,251,252,1) 100%)',
        boxShadow: '0 2px 2px rgba(15,23,42,0.35)',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(15,23,42,0.5)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 150, md: 170 },
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {surfacePreviewImage ? (
          <>
            <Box
              component="img"
              src={surfacePreviewImage}
              alt={court.surfaceType ?? 'Court surface'}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                pointerEvents: 'none',
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at center, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.72) 100%)',
              }}
            />
          </>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(30,41,59,0.58) 55%, rgba(51,65,85,0.48) 100%)',
            }}
          />
        )}

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', lg: 'flex-start' }}
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 2.25 },
          }}
        >
          <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  color: 'common.white',
                  textShadow: '0 2px 10px rgba(0,0,0,0.35)',
                }}
              >
                {court.courtName || `Court #${court.courtId}`}
              </Typography>

              <Chip
                label={statusLabel}
                variant="filled"
                sx={{
                  fontWeight: 800,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                  bgcolor: effectiveIsAvailable ? 'success.main' : 'error.main',
                  color: '#ffffff',
                }}
              />

              <Box
                sx={{
                  display: { xs: 'block', lg: 'none' },
                  px: 1.1,
                  py: 0.7,
                  borderRadius: 1.75,
                  bgcolor: 'rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    lineHeight: 1,
                    letterSpacing: 0.8,
                    color: 'rgba(255,255,255,0.78)',
                    fontWeight: 800,
                    fontSize: '0.62rem',
                  }}
                >
                  Price
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 900,
                    color: 'common.white',
                    textShadow: '0 2px 10px rgba(0,0,0,0.28)',
                    fontSize: '0.95rem',
                    lineHeight: 1.15,
                  }}
                >
                  {priceLabel}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <GlassChip label={court.surfaceType || 'Surface unspecified'} />
              <GlassChip label={court.isIndoor ? 'Indoor' : 'Outdoor'} variant="outlined" />

              {court.indoorCoverType && (
                <GlassChip
                  icon={<InfoOutlinedIcon />}
                  label={court.indoorCoverType}
                  variant="outlined"
                />
              )}

              {court.hasLighting && (
                <GlassChip
                  icon={<WbIncandescentIcon />}
                  label="Lighting"
                  variant="outlined"
                />
              )}

              {court.hasHeating && (
                <GlassChip
                  icon={<ThermostatIcon />}
                  label="Heating"
                  variant="outlined"
                />
              )}

              {court.hasCooling && (
                <GlassChip icon={<BoltIcon />} label="Cooling" variant="outlined" />
              )}

              {court.conditionRating != null && (
                <GlassChip
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>Condition</span>
                      {renderConditionStars(court.conditionRating)}
                    </Box>
                  }
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>

          <Box
            sx={{
              width: { xs: '100%', lg: 'auto' },
              display: { xs: 'none', lg: 'flex' },
              justifyContent: { xs: 'flex-start', lg: 'flex-end' },
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                px: 1.1,
                py: 0.7,
                borderRadius: 1.75,
                bgcolor: 'rgba(255,255,255,0.16)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.28)',
                minWidth: { xs: 'auto', lg: 110 },
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  lineHeight: 1,
                  letterSpacing: 0.8,
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 800,
                  fontSize: '0.62rem',
                }}
              >
                Price
              </Typography>

              <Typography
                sx={{
                  fontWeight: 900,
                  color: 'common.white',
                  textShadow: '0 2px 10px rgba(0,0,0,0.28)',
                  fontSize: { xs: '0.95rem', md: '1rem' },
                  lineHeight: 1.15,
                }}
              >
                {priceLabel}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      <CardContent
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 2, md: 3 },
          pt: { xs: 1.25, md: 1.5 },
        }}
      >
        <Stack spacing={1.25}>
          <CourtTimelineSelector
            date={date}
            timeBoxes={timeBoxes}
            clubOpenMinutes={clubOpenMinutes}
            clubCloseMinutes={clubCloseMinutes}
            selectedStartTime={selectionBounds.fromKey}
            selectedEndTime={selectionBounds.toKey}
            getEffectiveAvailableCount={getEffectiveAvailableCount}
            onSelectionChange={(nextStart, nextEnd) => {
              setSelectedStartTime(nextStart);
              setSelectedEndTime(nextEnd);
            }}
            maxAllowedDurationMinutes={maxAllowedDurationMinutes}
            allowedDurations={allowedDurations}
            onPreviewStateChange={(nextState) => {
              setPreviewState(nextState);
            }}
            onPreviewRangeChange={(nextRange) => {
              setPreviewRangeState(nextRange);
            }}
            showHeaderSummary={false}
            selectionColors={selectionColors}
            weatherHours={weatherHours}
          />

          <Stack
            direction={{ xs: 'column', xl: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', xl: 'center' }}
            justifyContent="space-between"
            sx={{ pt: 0.25 }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={1.25}
              alignItems={{ xs: 'flex-start', lg: 'center' }}
              useFlexGap
              sx={{ minWidth: 0, flex: 1 }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: effectiveIsAvailable ? 'success.main' : 'error.main',
                }}
              >
                {statusMessage}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip
                  size="small"
                  icon={<AccessTimeIcon />}
                  label={`${formatLocalShortDate(date)} · ${formatDisplayRange(
                    displayBounds.fromKey,
                    displayBounds.toKey
                  )}`}
                  variant="outlined"
                />

                <Chip
                  size="small"
                  label={formatDurationLabel(displayDurationMinutes)}
                  variant="outlined"
                />
              </Stack>
            </Stack>

            {!isDetailsOpen && (
              <Box
                sx={{
                  width: { xs: '100%', xl: 'auto' },
                  display: 'flex',
                  justifyContent: { xs: 'stretch', xl: 'flex-end' },
                  flexShrink: 0,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  disabled={!effectiveIsAvailable}
                  onClick={() => {
                    if (!effectiveIsAvailable) return;
                    setIsDetailsOpen(true);
                  }}
                  sx={{
                    minHeight: 48,
                    minWidth: 220,
                    width: { xs: '100%', sm: '100%', xl: 'auto' },
                    fontWeight: 800,
                    borderRadius: 3,
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(0,0,0,0.18)',
                      color: 'rgba(255,255,255,0.78)',
                    },
                  }}
                >
                  {actionButtonLabel}
                </Button>
              </Box>
            )}
          </Stack>

          <Collapse in={isDetailsOpen} unmountOnExit>
            <Box
              sx={{
                pt: 0.5,
                px: { xs: 0, md: 0.5 },
                pb: 0.5,
              }}
            >
              <CourtBookingPanel
                date={date}
                startLocalTime={selectionBounds.fromKey}
                durationMinutes={selectedDurationMinutes}
                court={court}
                displayPrice={localCalculatedPrice.price}
                displayCurrency={localCalculatedPrice.currency}
                isSelectionAvailable={effectiveIsAvailable}
                playerRequirementCutoffHours={playerRequirementCutoffHours}
                onBookingCreated={async () => {
                  setIsDetailsOpen(false);
                  await onBookingCreated();
                }}
                onCancel={() => setIsDetailsOpen(false)}
              />
            </Box>
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  );
}

function GlassChip({
  label,
  icon,
  variant = 'filled',
}: {
  label: ReactNode;
  icon?: ReactElement;
  variant?: 'filled' | 'outlined';
}) {
  return (
    <Chip
      size="small"
      icon={icon as ReactElement | undefined}
      label={label}
      variant={variant}
      sx={{
        color: 'common.white',
        borderColor: 'rgba(255,255,255,0.5)',
        bgcolor: variant === 'filled' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(8px)',
        '& .MuiChip-label': {
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
        },
        '& .MuiChip-icon': {
          color: 'common.white',
        },
      }}
    />
  );
}

function renderConditionStars(value: number | null | undefined) {
  const safeValue = Math.max(0, Math.min(5, value ?? 0));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.15 }}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < safeValue ? (
          <StarIcon key={i} sx={{ fontSize: 14, color: '#FFD700' }} />
        ) : (
          <StarBorderIcon key={i} sx={{ fontSize: 14, opacity: 0.4 }} />
        )
      )}
    </Box>
  );
}