import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DOMPurify from 'dompurify';
import { useMemo, useState } from 'react';
import type { ClubHeroDto, MediaItemDto } from '../../../api/discovery.api';

type Props = {
  club: ClubHeroDto;
};

function isVideoMedia(item: MediaItemDto) {
  const url = item.url.toLowerCase().split('?')[0];

  return (
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.ogg') ||
    url.endsWith('.mov') ||
    url.includes('/video/')
  );
}

function getHeroMedia(media: MediaItemDto[]) {
  return (
    media
      .filter((item) => item.usageType?.toLowerCase() === 'hero')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    media
      .filter((item) => item.usageType?.toLowerCase() === 'gallery')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    null
  );
}

function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : 'Not specified';
}

function buildAddressText(club: ClubHeroDto) {
  return (
    [club.addressLine1, club.city, club.country].filter(Boolean).join(', ') ||
    'Address not specified'
  );
}

export function ClubInfoTab({ club }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const galleryMedia = useMemo(() => {
    return (club.media ?? [])
      .filter((item) => item.usageType?.toLowerCase() === 'gallery')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [club.media]);

  const heroMedia = useMemo(() => getHeroMedia(club.media ?? []), [club.media]);

  const sanitizedDescription = useMemo(() => {
    return DOMPurify.sanitize(
      club.description || '<p>No club description has been added yet.</p>'
    );
  }, [club.description]);

  const selectedMedia =
    selectedIndex !== null && galleryMedia[selectedIndex]
      ? galleryMedia[selectedIndex]
      : null;

  const goPrevious = () => {
    if (selectedIndex === null || galleryMedia.length === 0) return;

    setSelectedIndex(
      selectedIndex === 0 ? galleryMedia.length - 1 : selectedIndex - 1
    );
  };

  const goNext = () => {
    if (selectedIndex === null || galleryMedia.length === 0) return;

    setSelectedIndex(
      selectedIndex === galleryMedia.length - 1 ? 0 : selectedIndex + 1
    );
  };

  return (
    <>
      <Stack spacing={2.5}>
        <Box
          sx={{
            px: { xs: 0.5, sm: 0 },
            py: { xs: 0.25, sm: 0.5 },
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={{ xs: 1.25, lg: 2 }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'flex-start' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Club details
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 0.25,
                  maxWidth: { xs: '100%', lg: '78ch' },
                }}
              >
                View the club profile, contact details, operating hours, booking
                conditions, and media gallery.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{
                width: { xs: '100%', lg: 'auto' },
                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                alignItems: 'center',
                rowGap: 1,
                columnGap: 1,
                flexShrink: 0,
                maxWidth: { xs: '100%', lg: '48%' },
              }}
            >
              <Chip
                icon={<AccessTimeIcon />}
                label={`${formatTime(club.operatingOpenTime)} – ${formatTime(
                  club.operatingCloseTime
                )}`}
                variant="outlined"
              />

              <Chip
                icon={<ImageOutlinedIcon />}
                label={`${galleryMedia.length} gallery item${
                  galleryMedia.length === 1 ? '' : 's'
                }`}
                variant="outlined"
              />

              <Chip
                label={club.isActive ? 'Active club' : 'Inactive club'}
                color={club.isActive ? 'success' : 'default'}
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Box>

        <Paper
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              minHeight: { xs: 260, md: 360 },
              display: 'flex',
              alignItems: 'flex-end',
              overflow: 'hidden',
              bgcolor: 'grey.900',
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
                  }}
                />
              ) : (
                <Box
                  component="img"
                  src={heroMedia.url}
                  alt={club.clubName || 'Club hero media'}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(135deg, rgba(27,94,32,0.95), rgba(102,187,106,0.85))',
                }}
              />
            )}

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68))',
              }}
            />

            <Box sx={{ position: 'relative', p: { xs: 2.5, md: 4 }, color: '#fff' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  lineHeight: 1,
                  textShadow: '0 8px 28px rgba(0,0,0,0.35)',
                }}
              >
                {club.clubName || `Club #${club.clubId}`}
              </Typography>

              <Typography sx={{ mt: 1, opacity: 0.92, maxWidth: 820 }}>
                Club profile and media gallery
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack spacing={3}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <InfoCard
                  icon={<LocationOnOutlinedIcon />}
                  title="Location"
                  primary={buildAddressText(club)}
                  secondary={
                    club.latitude != null && club.longitude != null
                      ? `${club.latitude}, ${club.longitude}`
                      : 'Coordinates not specified'
                  }
                />

                <InfoCard
                  icon={<PhoneOutlinedIcon />}
                  title="Contact"
                  primary={club.phone || 'Primary phone not specified'}
                  secondary={club.secondaryPhone || 'Secondary phone not specified'}
                />

                <InfoCard
                  icon={<PersonOutlineOutlinedIcon />}
                  title="Point of contact"
                  primary={club.pointOfContactName || 'Not specified'}
                  secondary="Main operational contact for this club."
                />

                <InfoCard
                  icon={<AccessTimeIcon />}
                  title="Operating hours"
                  primary={`${formatTime(club.operatingOpenTime)} – ${formatTime(
                    club.operatingCloseTime
                  )}`}
                  secondary="General club operating window. Individual courts may have their own schedule rules."
                />
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  p: { xs: 2, md: 2.5 },
                  bgcolor: 'grey.50',
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ContactPhoneOutlinedIcon color="success" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Booking conditions
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {club.playerRequirementCutoffHours != null ? (
                      <Tooltip
                        arrow
                        placement="top"
                        title="Cutoff means the latest point before the match when player-requirement conditions and related invitation setup must already be satisfied. After that point, the booking is too close to start time for those requirements to be relied on."
                      >
                        <Chip
                          label={`Invites cutoff is ${club.playerRequirementCutoffHours}h before match`}
                          color="success"
                          variant="outlined"
                          sx={{ cursor: 'help' }}
                        />
                      </Tooltip>
                    ) : (
                      <Chip
                        label="Invite cutoff not specified"
                        variant="outlined"
                      />
                    )}

                    <Chip
                      label={club.isActive ? 'Accepting bookings' : 'Not active'}
                      color={club.isActive ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </Stack>

                  <Typography color="text.secondary">
                    Player requirement deadlines are used when a booking needs
                    additional confirmed players. The cutoff protects the club and the users from relying
                    on invitations too close to the match start time.
                  </Typography>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  p: { xs: 2, md: 2.5 },
                  bgcolor: 'grey.50',
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoOutlinedIcon color="success" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Club description
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      '& p': { mt: 0, mb: 1.25 },
                      '& p:last-child': { mb: 0 },
                      '& ul, & ol': { pl: 3, my: 1 },
                      '& li': { mb: 0.5 },
                      '& blockquote': {
                        borderLeft: '4px solid',
                        borderColor: 'divider',
                        pl: 2,
                        ml: 0,
                        my: 1.5,
                      },
                      '& strong': { fontWeight: 800 },
                    }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizedDescription,
                    }}
                  />
                </Stack>
              </Paper>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  Gallery
                </Typography>

                {galleryMedia.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      p: 3,
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Typography color="text.secondary">
                      No gallery media available.
                    </Typography>
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      overflowX: 'auto',
                      pb: 1,
                      scrollSnapType: 'x mandatory',
                      '&::-webkit-scrollbar': {
                        height: 8,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'grey.400',
                        borderRadius: 999,
                      },
                    }}
                  >
                    {galleryMedia.map((item, index) => (
                      <Box
                        key={item.id}
                        onClick={() => setSelectedIndex(index)}
                        sx={{
                          flex: '0 0 auto',
                          width: { xs: 260, sm: 320, md: 360 },
                          height: { xs: 170, sm: 200, md: 220 },
                          borderRadius: 3,
                          overflow: 'hidden',
                          bgcolor: 'grey.100',
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          scrollSnapAlign: 'start',
                          position: 'relative',
                          transition:
                            'transform 0.18s ease, box-shadow 0.18s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(15,23,42,0.22)',
                          },
                        }}
                      >
                        {isVideoMedia(item) ? (
                          <Box
                            component="video"
                            src={item.url}
                            muted
                            loop
                            playsInline
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={item.url}
                            alt="Club gallery"
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        )}

                        {isVideoMedia(item) && (
                          <Chip
                            label="Video"
                            size="small"
                            sx={{
                              position: 'absolute',
                              left: 10,
                              bottom: 10,
                              bgcolor: 'rgba(0,0,0,0.68)',
                              color: '#fff',
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      <Dialog
        open={Boolean(selectedMedia)}
        onClose={() => setSelectedIndex(null)}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '94vw',
            height: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onTouchStart={(event) => {
            const startX = event.touches[0].clientX;

            const handleTouchEnd = (endEvent: TouchEvent) => {
              const endX = endEvent.changedTouches[0].clientX;
              const delta = endX - startX;

              if (Math.abs(delta) > 48) {
                if (delta > 0) {
                  goPrevious();
                } else {
                  goNext();
                }
              }

              window.removeEventListener('touchend', handleTouchEnd);
            };

            window.addEventListener('touchend', handleTouchEnd);
          }}
        >
          <IconButton
            onClick={() => setSelectedIndex(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 3,
              bgcolor: 'rgba(0,0,0,0.75)',
              color: '#ffffff',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.9)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {galleryMedia.length > 1 && (
            <>
              <IconButton
                onClick={goPrevious}
                sx={{
                  position: 'absolute',
                  left: { xs: 6, md: 18 },
                  zIndex: 3,
                  bgcolor: 'rgba(0,0,0,0.58)',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.82)',
                  },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>

              <IconButton
                onClick={goNext}
                sx={{
                  position: 'absolute',
                  right: { xs: 6, md: 18 },
                  zIndex: 3,
                  bgcolor: 'rgba(0,0,0,0.58)',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.82)',
                  },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}

          {selectedMedia &&
            (isVideoMedia(selectedMedia) ? (
              <Box
                component="video"
                src={selectedMedia.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                sx={{
                  maxWidth: '94vw',
                  maxHeight: '90vh',
                  borderRadius: 3,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  bgcolor: '#000',
                }}
              />
            ) : (
              <Box
                component="img"
                src={selectedMedia.url}
                alt="Club gallery preview"
                sx={{
                  maxWidth: '94vw',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: 3,
                  display: 'block',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                }}
              />
            ))}
        </Box>
      </Dialog>
    </>
  );
}

type InfoCardProps = {
  icon: React.ReactNode;
  title: string;
  primary: string;
  secondary: string;
};

function InfoCard({ icon, title, primary, secondary }: InfoCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: { xs: 2, md: 2.5 },
        bgcolor: 'grey.50',
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            color: 'success.main',
            display: 'flex',
            mt: 0.25,
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>

          <Typography sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
            {primary}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            {secondary}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}