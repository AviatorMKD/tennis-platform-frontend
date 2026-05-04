import BusinessIcon from '@mui/icons-material/Business';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  type CourtSummary,
  getMyOperatorClubCards,
} from '../../../api/operatorDashboard.api';
import { useAuth } from '../../../auth/useAuth';

function buildClubLocation(city: string | null, country: string | null): string {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Location not specified';
}

function buildSurfaceSummary(courts: CourtSummary[]): string[] {
  const distinct = Array.from(
    new Set(
      courts
        .map((court) => court.surfaceType?.trim())
        .filter((value): value is string => !!value && value.length > 0)
    )
  );

  return distinct.slice(0, 6);
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

export function OperatorDashboardPage() {
  const { user, isAuthenticated } = useAuth();

  const isSystemAdmin = user?.role === 'SystemAdmin';
  const currentUserId = user?.id ?? null;

  const dashboardQuery = useQuery({
    queryKey: ['operator-dashboard', currentUserId, isSystemAdmin],
    queryFn: () => getMyOperatorClubCards(currentUserId!, isSystemAdmin),
    enabled: isAuthenticated && currentUserId != null,
    staleTime: 30_000,
  });

  if (!isAuthenticated || currentUserId == null) {
    return (
      <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl">
          <Alert severity="error">
            You must be logged in to access the operator dashboard.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Box
        sx={{
          background:
            'linear-gradient(180deg, rgba(21,101,192,0.96) 0%, rgba(66,165,245,0.9) 100%)',
          color: 'common.white',
          py: { xs: 4, md: 6 },
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
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <BusinessIcon />
              <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                Club operations dashboard
              </Typography>
            </Stack>

            <Box>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  mb: 1.25,
                  maxWidth: 1000,
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
                Operator Dashboard
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  maxWidth: 1100,
                  opacity: 0.92,
                  fontSize: { xs: 18, md: 20 },
                }}
              >
                Review the clubs you operate, manage court inventory, and keep club details ready for player-facing booking flows.
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3.5}>
          {dashboardQuery.isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {dashboardQuery.isError && (
            <Alert severity="error">Failed to load operator dashboard data.</Alert>
          )}

          {!dashboardQuery.isLoading &&
            !dashboardQuery.isError &&
            (dashboardQuery.data?.length ?? 0) === 0 && (
              <Alert severity="info">
                No club operator assignments were found for your account.
              </Alert>
            )}

          {!dashboardQuery.isLoading &&
            !dashboardQuery.isError &&
            (dashboardQuery.data?.length ?? 0) > 0 && (
              <Stack spacing={2.5}>
                {dashboardQuery.data!.map((item) => {
                  const activeCourts = item.courts.filter((court) => court.isActive);
                  const indoorCourts = item.courts.filter((court) => court.isIndoor);
                  const litCourts = item.courts.filter((court) => court.hasLighting);
                  const surfaces = buildSurfaceSummary(item.courts);

                  return (
                    <Card
                      key={item.club.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 4,
                        bgcolor: '#ffffff',
                        boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                        <Stack spacing={2.5}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'flex-start', md: 'flex-start' }}
                            justifyContent="space-between"
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="h4"
                                sx={{ fontWeight: 850, mb: 0.75 }}
                              >
                                {item.club.name || `Club #${item.club.id}`}
                              </Typography>

                              <Typography variant="body1" color="text.secondary">
                                {buildClubLocation(item.club.city, item.club.country)}
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                label={item.club.isActive ? 'Active club' : 'Inactive club'}
                                color={item.club.isActive ? 'success' : 'default'}
                              />
                              <Chip
                                icon={<SportsTennisIcon />}
                                label={`${item.courts.length} courts`}
                                variant="outlined"
                              />
                              <Chip
                                icon={<BusinessIcon />}
                                label={`${item.operators.length} operators`}
                                variant="outlined"
                              />
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`${activeCourts.length} active courts`} variant="outlined" />
                            <Chip label={`${indoorCourts.length} indoor`} variant="outlined" />
                            <Chip label={`${litCourts.length} lighted`} variant="outlined" />
                            <Chip
                              label={`Cutoff: ${
                                item.club.playerRequirementCutoffHours ?? 'not set'
                              } hour(s)`}
                              variant="outlined"
                            />
                          </Stack>

                          {item.club.description && item.club.description.trim().length > 0 && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                lineHeight: 1.45,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {htmlToPreviewText(item.club.description)}
                            </Typography>
                          )}

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(3, minmax(0, 1fr))',
                              },
                              gap: 1.5,
                            }}
                          >
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}
                              >
                                Address
                              </Typography>
                              <Typography variant="body2">
                                {item.club.addressLine1?.trim() || 'Not specified'}
                              </Typography>
                            </Box>

                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}
                              >
                                Contact
                              </Typography>
                              <Typography variant="body2">
                                {item.club.phone?.trim() ||
                                  item.club.secondaryPhone?.trim() ||
                                  'Not specified'}
                              </Typography>
                            </Box>

                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}
                              >
                                Point of contact
                              </Typography>
                              <Typography variant="body2">
                                {item.club.pointOfContactName?.trim() || 'Not specified'}
                              </Typography>
                            </Box>
                          </Box>

                          {surfaces.length > 0 && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 1, fontWeight: 700 }}
                              >
                                Surface types
                              </Typography>

                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {surfaces.map((surface) => (
                                  <Chip key={surface} size="small" label={surface} />
                                ))}
                              </Stack>
                            </Box>
                          )}

                          <Divider />

                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 800, mb: 1.25 }}
                            >
                              Court overview
                            </Typography>

                            {item.courts.length === 0 ? (
                              <Alert severity="warning">
                                This club currently has no courts configured.
                              </Alert>
                            ) : (
                              <Stack spacing={1}>
                                {item.courts.slice(0, 5).map((court) => (
                                  <Box
                                    key={court.id}
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: 2,
                                      p: 1.25,
                                      borderRadius: 2.5,
                                      bgcolor: 'background.default',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography sx={{ fontWeight: 700 }}>
                                        {court.name || `Court #${court.id}`}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {court.surfaceType || 'Surface not specified'}
                                        {court.isIndoor ? ' · Indoor' : ' · Outdoor'}
                                        {court.hasLighting ? ' · Lighting' : ''}
                                      </Typography>
                                    </Box>

                                    <Chip
                                      size="small"
                                      label={court.isActive ? 'Active' : 'Inactive'}
                                      color={court.isActive ? 'success' : 'default'}
                                    />
                                  </Box>
                                ))}

                                {item.courts.length > 5 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +{item.courts.length - 5} more courts
                                  </Typography>
                                )}
                              </Stack>
                            )}
                          </Box>

                          <Stack
                            direction="row"
                            spacing={1.5}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{
                              justifyContent: 'flex-end',
                            }}
                          >

                          <Button
                              component={RouterLink}
                              to={`/operator/clubs/${item.club.id}/schedule`}
                              variant="contained"
                              startIcon={<CalendarMonthIcon />}
                              sx={{
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' },
                                fontWeight: 800,
                              }}
                            >
                              View schedule
                            </Button>

                            <Button
                              component={RouterLink}
                              to={`/operator/clubs/${item.club.id}/edit`}
                              variant="contained"
                              startIcon={<EditOutlinedIcon />}
                              sx={{
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' },
                                fontWeight: 800,
                              }}
                            >
                              Edit club details
                            </Button>

                            <Button
                              component={RouterLink}
                              to={`/operator/clubs/${item.club.id}/courts`}
                              variant="contained"
                              endIcon={<ChevronRightIcon />}
                              sx={{
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' },
                                fontWeight: 800,
                              }}
                            >
                              Manage courts
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
        </Stack>
      </Container>
    </Box>
  );
}