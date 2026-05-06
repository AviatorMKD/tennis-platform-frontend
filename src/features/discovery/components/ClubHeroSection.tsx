import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import {
  Box,
  Chip,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { ClubHeroDto } from '../../../api/discovery.api';

type ClubHeroSectionProps = {
  club: ClubHeroDto;
  rightContent?: ReactNode;
};

function buildGoogleMapsLink(club: ClubHeroDto) {
  if (club.latitude != null && club.longitude != null) {
    const label = club.clubName ? encodeURIComponent(club.clubName) : '';
    return `https://www.google.com/maps/dir/?api=1&destination=${club.latitude},${club.longitude}&destination_place_id=&destination_name=${label}`;
  }

  return null;
}

function htmlToPreviewText(html: string) {
  return html
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ClubHeroSection({ club, rightContent }: ClubHeroSectionProps) {
  const addressText =
    [club.addressLine1, club.city, club.country].filter(Boolean).join(', ') ||
    'Address not specified';

  const googleMapsLink = buildGoogleMapsLink(club);

  return (
    <Box
      sx={{
        color: 'inherit',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: rightContent ? 'minmax(0, 1.15fr) minmax(360px, 620px)' : '1fr',
            },
            gap: { xs: 3, xl: 5 },
            alignItems: 'center',
          }}
        >
          <Stack
              spacing={2.5}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 760, lg: 920, xl: 'none' },
                mx: { xs: 0, sm: 'auto', xl: 0 },
              }}
            >
            <Stack direction="row" spacing={1} alignItems="center">
              <SportsTennisIcon />
              <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                Club booking discovery
              </Typography>
            </Stack>

            <Box>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  mb: 1.25,
                  lineHeight: 0.96,
                  letterSpacing: '-0.03em',
                  fontSize: {
                    xs: '2.2rem',
                    sm: '2.8rem',
                    md: '3.6rem',
                    lg: '4.2rem',
                  },
                  textShadow: '0 8px 28px rgba(0,0,0,0.14)',
                }}
              >
                {club.clubName || `Club #${club.clubId}`}
              </Typography>

              <Typography
                  variant="body1"
                  sx={{ opacity: 0.92, fontSize: { xs: 18, md: 20 } }}
                >
                Choose your date, time range, and preferences, then book directly from
                the matching courts below.
              </Typography>

              {club.description && (
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.86,
                    mt: 1.25,
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {htmlToPreviewText(club.description)}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'flex-start',
              }}
            >
              <Chip
                label={`Working hours ${club.operatingOpenTime?.slice(0, 5) ?? '00:00'} – ${club.operatingCloseTime?.slice(0, 5) ?? '00:00'}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
              />

              {club.playerRequirementCutoffHours != null && (
                <Tooltip
                  arrow
                  placement="top"
                  title="Cutoff means the latest point before the match when player-requirement conditions and related invitation setup must already be satisfied. After that point, the booking is too close to start time for those requirements to be relied on."
                >
                  <Chip
                    label={`Invites cutoff is ${club.playerRequirementCutoffHours}h before match`}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: 'common.white',
                      cursor: 'help',
                    }}
                  />
                </Tooltip>
              )}
            </Box>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocationOnOutlinedIcon fontSize="small" />
                {googleMapsLink ? (
                  <Link
                    href={googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    color="inherit"
                    sx={{
                      opacity: 0.96,
                      textDecorationColor: 'rgba(255,255,255,0.45)',
                      '&:hover': {
                        textDecorationColor: 'rgba(255,255,255,0.85)',
                      },
                    }}
                  >
                    <Typography variant="body2" component="span">
                      {addressText}
                    </Typography>
                  </Link>
                ) : (
                  <Typography variant="body2">{addressText}</Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <PhoneOutlinedIcon fontSize="small" />
                <Typography variant="body2">
                  {club.phone || club.secondaryPhone || 'Phone not specified'}
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          {rightContent && (
  <Box
    sx={{
      width: '100%',
      minWidth: 0,
      maxWidth: { xs: '100%', sm: 520, md: 760, lg: 920, xl: 'none' },
      mx: { xs: 0, sm: 'auto', xl: 0 },
      justifySelf: { xs: 'stretch', sm: 'center', xl: 'stretch' },
    }}
  >
    {rightContent}
  </Box>
)}
        </Box>
      </Box>
    </Box>
  );
}