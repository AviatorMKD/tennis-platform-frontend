import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import SaveIcon from '@mui/icons-material/Save';
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
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import {
  createCourt,
  deleteCourt,
  getClubById,
  getCourts,
  type BookingGapPolicy,
  type CourtSummary,
  updateCourt,
} from '../../../api/operatorClubCourts.api';

type CourtFormState = {
  name: string;
  surfaceType: string;
  isIndoor: boolean;
  indoorCoverType: string;
  hasLighting: boolean;
  hasHeating: boolean;
  hasCooling: boolean;
  conditionRating: string;
  bookingGapPolicy: BookingGapPolicy;
  isActive: boolean;
  sortOrder: string;
};

type BookingDeleteGuardDto = {
  id: number;
  courtId: number;
  status: string | null;
  startUtc: string;
  endUtc: string;
};

const surfaceOptions = ['Hard', 'Clay', 'Grass', 'Carpet', 'Acrylic', 'Synthetic Grass'];

const indoorCoverOptions = ['', 'Air Dome', 'Permanent Hall', 'Bubble', 'Retractable Roof'];

function buildCreateForm(nextSortOrder: number): CourtFormState {
  return {
    name: '',
    surfaceType: '',
    isIndoor: false,
    indoorCoverType: '',
    hasLighting: false,
    hasHeating: false,
    hasCooling: false,
    conditionRating: '',
    bookingGapPolicy: 'Open',
    isActive: true,
    sortOrder: String(nextSortOrder),
  };
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

function buildEditForm(court: CourtSummary): CourtFormState {
  return {
    name: court.name ?? '',
    surfaceType: court.surfaceType ?? '',
    isIndoor: court.isIndoor,
    indoorCoverType: court.indoorCoverType ?? '',
    hasLighting: court.hasLighting,
    hasHeating: court.hasHeating,
    hasCooling: court.hasCooling,
    conditionRating: court.conditionRating?.toString() ?? '',
    bookingGapPolicy: court.bookingGapPolicy ?? 'Open',
    isActive: court.isActive,
    sortOrder: String(court.sortOrder),
  };
}

async function getBookingsByCourtId(courtId: number): Promise<BookingDeleteGuardDto[]> {
  const res = await apiClient.get<BookingDeleteGuardDto[]>(`/api/Bookings/by-court/${courtId}`);
  return res.data;
}

function hasFuturePendingOrConfirmedBookings(bookings: BookingDeleteGuardDto[]) {
  const nowMs = Date.now();

  return bookings.some((booking) => {
    const status = (booking.status ?? '').toLowerCase();
    const endMs = new Date(booking.endUtc).getTime();

    return (
      (status === 'pending' || status === 'confirmed') &&
      Number.isFinite(endMs) &&
      endMs > nowMs
    );
  });
}

export function OperatorClubCourtsPage() {
  const { clubId } = useParams();
  const parsedClubId = Number(clubId);
  const queryClient = useQueryClient();

  const [createForm, setCreateForm] = useState<CourtFormState>(buildCreateForm(1));
  const [editingCourtId, setEditingCourtId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CourtFormState | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clubQuery = useQuery({
    queryKey: ['operator-club', parsedClubId],
    queryFn: () => getClubById(parsedClubId),
    enabled: Number.isFinite(parsedClubId) && parsedClubId > 0,
  });

  const courtsQuery = useQuery({
    queryKey: ['operator-courts'],
    queryFn: getCourts,
  });

  const clubCourts = useMemo(() => {
    return (courtsQuery.data ?? [])
      .filter((court) => court.clubId === parsedClubId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }, [courtsQuery.data, parsedClubId]);

  const nextSortOrder = useMemo(() => {
    return clubCourts.length > 0
      ? Math.max(...clubCourts.map((court) => court.sortOrder)) + 1
      : 1;
  }, [clubCourts]);

  const createMutation = useMutation({
    mutationFn: async (form: CourtFormState) => {
      const conditionRating =
        form.conditionRating.trim() === '' ? null : Number(form.conditionRating.trim());
      const rawSortOrder = form.sortOrder.trim();
      const sortOrder = rawSortOrder === '' ? nextSortOrder : Number(rawSortOrder);

      if (Number.isNaN(sortOrder)) {
        throw new Error('Sort order must be a valid number.');
      }

      if (conditionRating !== null && Number.isNaN(conditionRating)) {
        throw new Error('Condition rating must be a valid number.');
      }

      return createCourt({
        clubId: parsedClubId,
        name: form.name.trim() || null,
        surfaceType: form.surfaceType.trim() || null,
        isIndoor: form.isIndoor,
        indoorCoverType: form.isIndoor ? form.indoorCoverType.trim() || null : null,
        hasLighting: form.hasLighting,
        hasHeating: form.hasHeating,
        hasCooling: form.hasCooling,
        conditionRating,
        bookingGapPolicy: form.bookingGapPolicy,
        sortOrder,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Court created successfully.');
      setErrorMessage(null);

      await queryClient.invalidateQueries({
        queryKey: ['operator-courts'],
      });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create court.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { courtId: number; form: CourtFormState }) => {
      const conditionRating =
        payload.form.conditionRating.trim() === ''
          ? null
          : Number(payload.form.conditionRating.trim());
      const sortOrder = Number(payload.form.sortOrder.trim());

      if (Number.isNaN(sortOrder)) {
        throw new Error('Sort order must be a valid number.');
      }

      if (conditionRating !== null && Number.isNaN(conditionRating)) {
        throw new Error('Condition rating must be a valid number.');
      }

      return updateCourt(payload.courtId, {
        clubId: parsedClubId,
        name: payload.form.name.trim() || null,
        surfaceType: payload.form.surfaceType.trim() || null,
        isIndoor: payload.form.isIndoor,
        indoorCoverType: payload.form.isIndoor
          ? payload.form.indoorCoverType.trim() || null
          : null,
        hasLighting: payload.form.hasLighting,
        hasHeating: payload.form.hasHeating,
        hasCooling: payload.form.hasCooling,
        conditionRating,
        bookingGapPolicy: payload.form.bookingGapPolicy,
        isActive: payload.form.isActive,
        sortOrder,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Court updated successfully.');
      setErrorMessage(null);
      setEditingCourtId(null);
      setEditForm(null);

      await queryClient.invalidateQueries({
        queryKey: ['operator-courts'],
      });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update court.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (court: CourtSummary) => {
      const bookings = await getBookingsByCourtId(court.id);

      if (hasFuturePendingOrConfirmedBookings(bookings)) {
        throw new Error(
          `Court "${court.name || `#${court.id}`}" cannot be deleted because it has future Pending or Confirmed bookings. Resolve those bookings first.`
        );
      }

      await deleteCourt(court.id);
    },
    onSuccess: async () => {
      setSaveMessage('Court deleted successfully.');
      setErrorMessage(null);
      setEditingCourtId(null);
      setEditForm(null);

      await queryClient.invalidateQueries({
        queryKey: ['operator-courts'],
      });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete court.');
    },
  });

  const handleCreateFieldChange = (field: keyof CourtFormState, value: string | boolean) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'isIndoor' && value === false ? { indoorCoverType: '' } : {}),
    }));
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleEditFieldChange = (field: keyof CourtFormState, value: string | boolean) => {
    setEditForm((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
            ...(field === 'isIndoor' && value === false ? { indoorCoverType: '' } : {}),
          }
        : prev
    );
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleCreate = async () => {
    if (createForm.name.trim() === '') {
      setErrorMessage('Court name is required.');
      setSaveMessage(null);
      return;
    }

    await createMutation.mutateAsync(createForm);
    setCreateForm(buildCreateForm(nextSortOrder + 1));
  };

  const handleStartEdit = (court: CourtSummary) => {
    setEditingCourtId(court.id);
    setEditForm(buildEditForm(court));
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleSaveEdit = async () => {
    if (editingCourtId == null || !editForm) {
      setErrorMessage('No court is selected for editing.');
      setSaveMessage(null);
      return;
    }

    if (editForm.name.trim() === '') {
      setErrorMessage('Court name is required.');
      setSaveMessage(null);
      return;
    }

    await updateMutation.mutateAsync({
      courtId: editingCourtId,
      form: editForm,
    });
  };

  const isBusy =
    clubQuery.isLoading ||
    courtsQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  if (!Number.isFinite(parsedClubId) || parsedClubId <= 0) {
    return (
      <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl">
          <Alert severity="error">Invalid club id.</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Box
            sx={{
              borderRadius: 5,
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, rgba(21,101,192,0.96) 0%, rgba(66,165,245,0.9) 100%)',
              color: 'common.white',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 22%), radial-gradient(circle at 85% 25%, rgba(255,255,255,0.18) 0, rgba(255,255,255,0) 18%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
              }}
            />

            <Box sx={{ position: 'relative', p: { xs: 3, md: 5 } }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SettingsSuggestIcon />
                  <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                    Club court operations
                  </Typography>
                </Stack>

                <Box>
                  <Typography
                    variant="h1"
                    sx={{
                      fontWeight: 900,
                      mb: 1.25,
                      maxWidth: 900,
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
                    Club Courts Management
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      maxWidth: 1400,
                      opacity: 0.92,
                      fontSize: { xs: 18, md: 20 },
                    }}
                  >
                    Create, review, edit, and manage courts for this club. Keep surfaces,
                    facilities, booking rules, and court availability aligned with the live booking
                    flow.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={clubQuery.data?.name || `Club #${parsedClubId}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                  <Chip
                    label={`${clubCourts.length} court(s)`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                  {clubQuery.data && (
                    <Chip
                      label={clubQuery.data.isActive ? 'Active club' : 'Inactive club'}
                      sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                    />
                  )}
                </Stack>
              </Stack>
            </Box>
          </Box>

          {saveMessage && <Alert severity="success">{saveMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          {(clubQuery.isError || courtsQuery.isError) && (
            <Alert severity="error">Failed to load club or court data.</Alert>
          )}

          {isBusy && clubQuery.isLoading && courtsQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Club Overview
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={`Club ID: ${parsedClubId}`} variant="outlined" />
                      {clubQuery.data && (
                        <>
                          <Chip
                            label={clubQuery.data.isActive ? 'Active club' : 'Inactive club'}
                            color={clubQuery.data.isActive ? 'success' : 'default'}
                          />
                          <Chip label={`${clubCourts.length} courts`} variant="outlined" />
                        </>
                      )}
                    </Stack>

                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {clubQuery.data?.name || `Club #${parsedClubId}`}
                    </Typography>

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
					  {clubQuery.data?.description?.trim()
						? htmlToPreviewText(clubQuery.data.description)
						: 'No club description available.'}
					</Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' },
                  gap: 3,
                  alignItems: 'start',
                }}
              >
                <Card>
                  <CardContent>
                    <Stack spacing={2.5}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Create Court
                      </Typography>

                      <TextField
                        label="Court name"
                        value={createForm.name}
                        onChange={(e) => handleCreateFieldChange('name', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Surface type"
                        select
                        value={createForm.surfaceType}
                        onChange={(e) => handleCreateFieldChange('surfaceType', e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Not specified</MenuItem>
                        {surfaceOptions.map((surface) => (
                          <MenuItem key={surface} value={surface}>
                            {surface}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        label="Sort order"
                        value={createForm.sortOrder || String(nextSortOrder)}
                        onChange={(e) => handleCreateFieldChange('sortOrder', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Condition rating"
                        value={createForm.conditionRating}
                        onChange={(e) =>
                          handleCreateFieldChange('conditionRating', e.target.value)
                        }
                        helperText="Optional numeric rating"
                        fullWidth
                      />

                      <TextField
                        label="Booking gap policy"
                        select
                        value={createForm.bookingGapPolicy}
                        onChange={(e) =>
                          handleCreateFieldChange('bookingGapPolicy', e.target.value)
                        }
                        helperText="Strict prevents small unusable leftover gaps except at court closing boundary."
                        fullWidth
                      >
                        <MenuItem value="Open">Open</MenuItem>
                        <MenuItem value="Strict">Strict</MenuItem>
                      </TextField>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={createForm.isIndoor}
                            onChange={(e) =>
                              handleCreateFieldChange('isIndoor', e.target.checked)
                            }
                          />
                        }
                        label="Indoor court"
                      />

                      {createForm.isIndoor && (
                        <TextField
                          label="Indoor cover type"
                          select
                          value={createForm.indoorCoverType}
                          onChange={(e) =>
                            handleCreateFieldChange('indoorCoverType', e.target.value)
                          }
                          fullWidth
                        >
                          {indoorCoverOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option || 'Not specified'}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}

                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={createForm.hasLighting}
                              onChange={(e) =>
                                handleCreateFieldChange('hasLighting', e.target.checked)
                              }
                            />
                          }
                          label="Lighting"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={createForm.hasHeating}
                              onChange={(e) =>
                                handleCreateFieldChange('hasHeating', e.target.checked)
                              }
                            />
                          }
                          label="Heating"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={createForm.hasCooling}
                              onChange={(e) =>
                                handleCreateFieldChange('hasCooling', e.target.checked)
                              }
                            />
                          }
                          label="Cooling"
                        />
                      </Stack>

                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => void handleCreate()}
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? 'Creating...' : 'Create court'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>

                <Stack spacing={3}>
                  {clubCourts.length === 0 ? (
                    <Alert severity="info">
                      No courts exist for this club yet. Create the first one from the panel on
                      the left.
                    </Alert>
                  ) : (
                    clubCourts.map((court) => {
                      const isEditing = editingCourtId === court.id;
                      const activeForm = isEditing ? editForm : null;
                      const isDeletingThisCourt =
                        deleteMutation.isPending && deleteMutation.variables?.id === court.id;

                      return (
                        <Card key={court.id}>
                          <CardContent>
                            {!isEditing || !activeForm ? (
                              <Stack spacing={2}>
                                <Stack
                                  direction="row"
                                  spacing={1.5}
                                  justifyContent="space-between"
                                  alignItems="flex-start"
                                  flexWrap="wrap"
                                >
                                  <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                      {court.name || `Court #${court.id}`}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {court.surfaceType || 'Surface not specified'}
                                      {court.isIndoor ? ' · Indoor' : ' · Outdoor'}
                                    </Typography>
                                  </Box>

                                  <Stack direction="row" spacing={1} flexWrap="wrap">
                                    <Chip
                                      label={court.isActive ? 'Active' : 'Inactive'}
                                      color={court.isActive ? 'success' : 'default'}
                                      size="small"
                                    />
                                    <Chip
                                      label={`Sort: ${court.sortOrder}`}
                                      variant="outlined"
                                      size="small"
                                    />
                                  </Stack>
                                </Stack>

                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Chip
                                    label={court.hasLighting ? 'Lighting' : 'No lighting'}
                                    variant="outlined"
                                    size="small"
                                  />
                                  <Chip
                                    label={court.hasHeating ? 'Heating' : 'No heating'}
                                    variant="outlined"
                                    size="small"
                                  />
                                  <Chip
                                    label={court.hasCooling ? 'Cooling' : 'No cooling'}
                                    variant="outlined"
                                    size="small"
                                  />
                                  <Chip
                                    label={`Gap policy: ${court.bookingGapPolicy}`}
                                    variant="outlined"
                                    size="small"
                                    color={
                                      court.bookingGapPolicy === 'Strict' ? 'warning' : 'default'
                                    }
                                  />
                                  {court.conditionRating != null && (
                                    <Chip
                                      label={`Condition: ${court.conditionRating}`}
                                      variant="outlined"
                                      size="small"
                                    />
                                  )}
                                </Stack>

                                <Divider />

                                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                                  <Button
                                    variant="contained"
                                    startIcon={<SettingsSuggestIcon />}
                                    component={RouterLink}
                                    to={`/operator/courts/${court.id}/manage`}
                                  >
                                    Manage schedule & pricing
                                  </Button>

                                  <Button
                                    variant="outlined"
                                    startIcon={<EditOutlinedIcon />}
                                    onClick={() => handleStartEdit(court)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    Edit
                                  </Button>

                                  <Button
                                    color="error"
                                    variant="outlined"
                                    startIcon={<DeleteOutlineIcon />}
                                    onClick={() => void deleteMutation.mutateAsync(court)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    {isDeletingThisCourt ? 'Checking...' : 'Delete'}
                                  </Button>
                                </Stack>
                              </Stack>
                            ) : (
                              <Stack spacing={2.5}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                  Edit Court
                                </Typography>

                                <TextField
                                  label="Court name"
                                  value={activeForm.name}
                                  onChange={(e) =>
                                    handleEditFieldChange('name', e.target.value)
                                  }
                                  fullWidth
                                />

                                <TextField
                                  label="Surface type"
                                  select
                                  value={activeForm.surfaceType}
                                  onChange={(e) =>
                                    handleEditFieldChange('surfaceType', e.target.value)
                                  }
                                  fullWidth
                                >
                                  <MenuItem value="">Not specified</MenuItem>
                                  {surfaceOptions.map((surface) => (
                                    <MenuItem key={surface} value={surface}>
                                      {surface}
                                    </MenuItem>
                                  ))}
                                </TextField>

                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                    gap: 2,
                                  }}
                                >
                                  <TextField
                                    label="Sort order"
                                    value={activeForm.sortOrder}
                                    onChange={(e) =>
                                      handleEditFieldChange('sortOrder', e.target.value)
                                    }
                                    fullWidth
                                  />

                                  <TextField
                                    label="Condition rating"
                                    value={activeForm.conditionRating}
                                    onChange={(e) =>
                                      handleEditFieldChange('conditionRating', e.target.value)
                                    }
                                    fullWidth
                                  />
                                </Box>

                                <TextField
                                  label="Booking gap policy"
                                  select
                                  value={activeForm.bookingGapPolicy}
                                  onChange={(e) =>
                                    handleEditFieldChange('bookingGapPolicy', e.target.value)
                                  }
                                  helperText="Strict prevents small unusable leftover gaps except at court closing boundary."
                                  fullWidth
                                >
                                  <MenuItem value="Open">Open</MenuItem>
                                  <MenuItem value="Strict">Strict</MenuItem>
                                </TextField>

                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={activeForm.isIndoor}
                                        onChange={(e) =>
                                          handleEditFieldChange('isIndoor', e.target.checked)
                                        }
                                      />
                                    }
                                    label="Indoor"
                                  />

                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={activeForm.isActive}
                                        onChange={(e) =>
                                          handleEditFieldChange('isActive', e.target.checked)
                                        }
                                      />
                                    }
                                    label="Active"
                                  />
                                </Stack>

                                {activeForm.isIndoor && (
                                  <TextField
                                    label="Indoor cover type"
                                    select
                                    value={activeForm.indoorCoverType}
                                    onChange={(e) =>
                                      handleEditFieldChange('indoorCoverType', e.target.value)
                                    }
                                    fullWidth
                                  >
                                    {indoorCoverOptions.map((option) => (
                                      <MenuItem key={option} value={option}>
                                        {option || 'Not specified'}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                )}

                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={activeForm.hasLighting}
                                        onChange={(e) =>
                                          handleEditFieldChange(
                                            'hasLighting',
                                            e.target.checked
                                          )
                                        }
                                      />
                                    }
                                    label="Lighting"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={activeForm.hasHeating}
                                        onChange={(e) =>
                                          handleEditFieldChange('hasHeating', e.target.checked)
                                        }
                                      />
                                    }
                                    label="Heating"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={activeForm.hasCooling}
                                        onChange={(e) =>
                                          handleEditFieldChange('hasCooling', e.target.checked)
                                        }
                                      />
                                    }
                                    label="Cooling"
                                  />
                                </Stack>

                                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                                  <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    onClick={() => void handleSaveEdit()}
                                    disabled={updateMutation.isPending}
                                  >
                                    {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                                  </Button>

                                  <Button
                                    variant="outlined"
                                    onClick={() => {
                                      setEditingCourtId(null);
                                      setEditForm(null);
                                      setSaveMessage(null);
                                      setErrorMessage(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </Stack>
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}