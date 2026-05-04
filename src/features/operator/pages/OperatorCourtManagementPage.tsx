import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  createBlock,
  createPriceRule,
  createScheduleRule,
  deleteBlock,
  deletePriceRule,
  deleteScheduleRule,
  getBlocksByCourtId,
  getCourtById,
  getPriceRulesByCourtId,
  getScheduleRulesByCourtId,
  type CourtBlockDto,
  type CourtPriceRuleDto,
  type CourtScheduleRuleDto,
  updateBlock,
  updatePriceRule,
  updateScheduleRule,
} from '../../../api/operatorCourtManagement.api';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatLocalDateTime,
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from '../../../shared/utils/dateTime';

type ScheduleForm = {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  allowedDurations: string;
  isActive: boolean;
};

type PriceForm = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  price: string;
  currency: string;
  isActive: boolean;
};

type BlockForm = {
  startUtc: string;
  endUtc: string;
  reason: string;
};

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function getDayLabel(dayOfWeek: number) {
  return daysOfWeek.find((d) => d.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

function buildScheduleForm(rule?: CourtScheduleRuleDto): ScheduleForm {
  return {
    dayOfWeek: String(rule?.dayOfWeek ?? 1),
    openTime: rule?.openTime ?? '08:00:00',
    closeTime: rule?.closeTime ?? '22:00:00',
    allowedDurations: rule?.allowedDurations ?? '60,90,120',
    isActive: rule?.isActive ?? true,
  };
}

function buildPriceForm(rule?: CourtPriceRuleDto): PriceForm {
  return {
    dayOfWeek: String(rule?.dayOfWeek ?? 1),
    startTime: rule?.startTime ?? '08:00:00',
    endTime: rule?.endTime ?? '22:00:00',
    durationMinutes: String(rule?.durationMinutes ?? 60),
    price: rule?.price != null ? String(rule.price) : '',
    currency: rule?.currency ?? 'Denars',
    isActive: rule?.isActive ?? true,
  };
}

function buildBlockForm(block?: CourtBlockDto): BlockForm {
  return {
    startUtc: toLocalDateTimeInputValue(block?.startUtc),
    endUtc: toLocalDateTimeInputValue(block?.endUtc),
    reason: block?.reason ?? '',
  };
}

function parseTimeToMinutes(value: string) {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return NaN;
  }

  return hours * 60 + minutes;
}

function isValid30MinuteStep(value: string) {
  const [, minutesText] = value.split(':');
  const minutes = Number(minutesText);

  return minutes === 0 || minutes === 30;
}

function validateScheduleForm(form: ScheduleForm) {
  const openMinutes = parseTimeToMinutes(form.openTime);
  const closeMinutes = parseTimeToMinutes(form.closeTime);

  if (Number.isNaN(openMinutes) || Number.isNaN(closeMinutes)) {
    throw new Error('Open and close time must be valid.');
  }

  if (!isValid30MinuteStep(form.openTime) || !isValid30MinuteStep(form.closeTime)) {
    throw new Error('Open and close time must use 30-minute steps, for example 08:00 or 08:30.');
  }

  if (openMinutes >= closeMinutes) {
    throw new Error('Close time must be later than open time.');
  }
}

function validatePriceForm(form: PriceForm) {
  const durationMinutes = Number(form.durationMinutes);
  const price = Number(form.price);

  if (Number.isNaN(durationMinutes)) {
    throw new Error('Duration must be a valid number.');
  }

  if (durationMinutes <= 0) {
    throw new Error('Duration must be greater than 0.');
  }

  if (Number.isNaN(price)) {
    throw new Error('Price must be a valid number.');
  }

  if (price < 0) {
    throw new Error('Price cannot be negative.');
  }

  const startMinutes = parseTimeToMinutes(form.startTime);
  const endMinutes = parseTimeToMinutes(form.endTime);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
    throw new Error('Start and end time must be valid.');
  }

  if (startMinutes >= endMinutes) {
    throw new Error('End time must be later than start time.');
  }
}

function validateBlockForm(form: BlockForm) {
  if (!form.startUtc || !form.endUtc) {
    throw new Error('Start and end date/time are required.');
  }

  const startUtc = fromLocalDateTimeInputValue(form.startUtc);
  const endUtc = fromLocalDateTimeInputValue(form.endUtc);

  const startMs = new Date(startUtc).getTime();
  const endMs = new Date(endUtc).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error('Start and end date/time must be valid.');
  }

  if (startMs >= endMs) {
    throw new Error('End date/time must be later than start date/time.');
  }
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: '14px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}

export function OperatorCourtManagementPage() {
  const { courtId } = useParams();
  const parsedCourtId = Number(courtId);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);

  const [scheduleEditingId, setScheduleEditingId] = useState<number | null>(null);
  const [scheduleCreateForm, setScheduleCreateForm] = useState<ScheduleForm>(buildScheduleForm());
  const [scheduleEditForm, setScheduleEditForm] = useState<ScheduleForm | null>(null);

  const [priceEditingId, setPriceEditingId] = useState<number | null>(null);
  const [priceCreateForm, setPriceCreateForm] = useState<PriceForm>(buildPriceForm());
  const [priceEditForm, setPriceEditForm] = useState<PriceForm | null>(null);

  const [blockEditingId, setBlockEditingId] = useState<number | null>(null);
  const [blockCreateForm, setBlockCreateForm] = useState<BlockForm>(buildBlockForm());
  const [blockEditForm, setBlockEditForm] = useState<BlockForm | null>(null);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const courtQuery = useQuery({
    queryKey: ['operator-court', parsedCourtId],
    queryFn: () => getCourtById(parsedCourtId),
    enabled: Number.isFinite(parsedCourtId) && parsedCourtId > 0,
  });

  const schedulesQuery = useQuery({
    queryKey: ['operator-court-schedules', parsedCourtId],
    queryFn: () => getScheduleRulesByCourtId(parsedCourtId),
    enabled: Number.isFinite(parsedCourtId) && parsedCourtId > 0,
  });

  const pricesQuery = useQuery({
    queryKey: ['operator-court-prices', parsedCourtId],
    queryFn: () => getPriceRulesByCourtId(parsedCourtId),
    enabled: Number.isFinite(parsedCourtId) && parsedCourtId > 0,
  });

  const blocksQuery = useQuery({
    queryKey: ['operator-court-blocks', parsedCourtId],
    queryFn: () => getBlocksByCourtId(parsedCourtId),
    enabled: Number.isFinite(parsedCourtId) && parsedCourtId > 0,
  });

  const sortedSchedules = useMemo(
    () =>
      [...(schedulesQuery.data ?? [])].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.openTime.localeCompare(b.openTime)
      ),
    [schedulesQuery.data]
  );

  const sortedPrices = useMemo(
    () =>
      [...(pricesQuery.data ?? [])].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
      ),
    [pricesQuery.data]
  );

  const sortedBlocks = useMemo(
    () =>
      [...(blocksQuery.data ?? [])].sort(
        (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
      ),
    [blocksQuery.data]
  );

  const createScheduleMutation = useMutation({
    mutationFn: async (form: ScheduleForm) => {
      validateScheduleForm(form);

      return createScheduleRule({
        courtId: parsedCourtId,
        dayOfWeek: Number(form.dayOfWeek),
        openTime: form.openTime,
        closeTime: form.closeTime,
        baseSlotMinutes: 30,
        allowedDurations: form.allowedDurations.trim() || null,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Schedule rule created successfully.');
      setErrorMessage(null);
      setScheduleCreateForm(buildScheduleForm());
      await queryClient.invalidateQueries({ queryKey: ['operator-court-schedules', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to create schedule rule.'));
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (payload: { id: number; form: ScheduleForm }) => {
      validateScheduleForm(payload.form);

      return updateScheduleRule(payload.id, {
        dayOfWeek: Number(payload.form.dayOfWeek),
        openTime: payload.form.openTime,
        closeTime: payload.form.closeTime,
        baseSlotMinutes: 30,
        allowedDurations: payload.form.allowedDurations.trim() || null,
        isActive: payload.form.isActive,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Schedule rule updated successfully.');
      setErrorMessage(null);
      setScheduleEditingId(null);
      setScheduleEditForm(null);
      await queryClient.invalidateQueries({ queryKey: ['operator-court-schedules', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to update schedule rule.'));
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteScheduleRule,
    onSuccess: async () => {
      setSaveMessage('Schedule rule deleted successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['operator-court-schedules', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to delete schedule rule.'));
    },
  });

  const createPriceMutation = useMutation({
    mutationFn: async (form: PriceForm) => {
      validatePriceForm(form);

      return createPriceRule({
        courtId: parsedCourtId,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: Number(form.durationMinutes),
        price: Number(form.price),
        currency: form.currency.trim() || 'Denars',
      });
    },
    onSuccess: async () => {
      setSaveMessage('Price rule created successfully.');
      setErrorMessage(null);
      setPriceCreateForm(buildPriceForm());
      await queryClient.invalidateQueries({ queryKey: ['operator-court-prices', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to create price rule.'));
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (payload: { id: number; form: PriceForm }) => {
      validatePriceForm(payload.form);

      return updatePriceRule(payload.id, {
        dayOfWeek: Number(payload.form.dayOfWeek),
        startTime: payload.form.startTime,
        endTime: payload.form.endTime,
        durationMinutes: Number(payload.form.durationMinutes),
        price: Number(payload.form.price),
        currency: payload.form.currency.trim() || 'Denars',
        isActive: payload.form.isActive,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Price rule updated successfully.');
      setErrorMessage(null);
      setPriceEditingId(null);
      setPriceEditForm(null);
      await queryClient.invalidateQueries({ queryKey: ['operator-court-prices', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to update price rule.'));
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: deletePriceRule,
    onSuccess: async () => {
      setSaveMessage('Price rule deleted successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['operator-court-prices', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to delete price rule.'));
    },
  });

  const createBlockMutation = useMutation({
    mutationFn: async (form: BlockForm) => {
      validateBlockForm(form);

      return createBlock({
        courtId: parsedCourtId,
        startUtc: fromLocalDateTimeInputValue(form.startUtc),
        endUtc: fromLocalDateTimeInputValue(form.endUtc),
        reason: form.reason.trim() || null,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Court block created successfully.');
      setErrorMessage(null);
      setBlockCreateForm(buildBlockForm());
      await queryClient.invalidateQueries({ queryKey: ['operator-court-blocks', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to create block.'));
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async (payload: { id: number; form: BlockForm }) => {
      validateBlockForm(payload.form);

      return updateBlock(payload.id, {
        startUtc: fromLocalDateTimeInputValue(payload.form.startUtc),
        endUtc: fromLocalDateTimeInputValue(payload.form.endUtc),
        reason: payload.form.reason.trim() || null,
      });
    },
    onSuccess: async () => {
      setSaveMessage('Court block updated successfully.');
      setErrorMessage(null);
      setBlockEditingId(null);
      setBlockEditForm(null);
      await queryClient.invalidateQueries({ queryKey: ['operator-court-blocks', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to update block.'));
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: deleteBlock,
    onSuccess: async () => {
      setSaveMessage('Court block deleted successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['operator-court-blocks', parsedCourtId] });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to delete block.'));
    },
  });

  const isAnyScheduleMutationPending =
    createScheduleMutation.isPending ||
    updateScheduleMutation.isPending ||
    deleteScheduleMutation.isPending;

  const isAnyPriceMutationPending =
    createPriceMutation.isPending ||
    updatePriceMutation.isPending ||
    deletePriceMutation.isPending;

  const isAnyBlockMutationPending =
    createBlockMutation.isPending ||
    updateBlockMutation.isPending ||
    deleteBlockMutation.isPending;

  if (!Number.isFinite(parsedCourtId) || parsedCourtId <= 0) {
    return (
      <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl">
          <Alert severity="error">Invalid court id.</Alert>
        </Container>
      </Box>
    );
  }

  const isLoading =
    courtQuery.isLoading ||
    schedulesQuery.isLoading ||
    pricesQuery.isLoading ||
    blocksQuery.isLoading;

  const hasQueryError =
    courtQuery.isError ||
    schedulesQuery.isError ||
    pricesQuery.isError ||
    blocksQuery.isError;

  const queryError =
    courtQuery.error ||
    schedulesQuery.error ||
    pricesQuery.error ||
    blocksQuery.error;

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
                  <AccessTimeIcon />
                  <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                    Court operations
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
                    {courtQuery.data?.name || `Court #${parsedCourtId}`}
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      maxWidth: 900,
                      opacity: 0.92,
                      fontSize: { xs: 18, md: 20 },
                    }}
                  >
                    Configure schedule rules, pricing logic, and court blocks. The base slot is
                    system-defined at 30 minutes while allowed durations remain the business rule.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={courtQuery.data?.surfaceType || 'Surface not specified'}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                  <Chip
                    label={courtQuery.data?.isIndoor ? 'Indoor' : 'Outdoor'}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                  <Chip
                    label={`Gap policy: ${courtQuery.data?.bookingGapPolicy ?? 'Open'}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                  <Chip
                    label={courtQuery.data?.isActive ? 'Active' : 'Inactive'}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                </Stack>

                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                  <Button
                    component={RouterLink}
                    to={`/operator/clubs/${courtQuery.data?.clubId ?? ''}/courts`}
                    variant="outlined"
                    sx={{
                      color: 'common.white',
                      borderColor: 'rgba(255,255,255,0.42)',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.72)',
                        bgcolor: 'rgba(255,255,255,0.08)',
                      },
                    }}
                  >
                    Back to club courts
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>

          {saveMessage && <Alert severity="success">{saveMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          {hasQueryError && (
            <Alert severity="error">
              {extractApiErrorMessage(queryError, 'Failed to load court operations data.')}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Tabs
                    value={tab}
                    onChange={(_, value) => {
                      setTab(value);
                      setSaveMessage(null);
                      setErrorMessage(null);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab icon={<AccessTimeIcon />} iconPosition="start" label="Schedule Rules" />
                    <Tab icon={<AttachMoneyIcon />} iconPosition="start" label="Price Rules" />
                    <Tab icon={<BlockIcon />} iconPosition="start" label="Blocks" />
                  </Tabs>
                </CardContent>
              </Card>

              {tab === 0 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', xl: '420px 1fr' },
                    gap: 3,
                    alignItems: 'start',
                  }}
                >
                  <Card sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack spacing={2.5}>
                        <SectionHeader
                          icon={<AccessTimeIcon />}
                          title="New schedule rule"
                          subtitle="Define bookable hours and allowed booking durations."
                        />

                        <TextField
                          select
                          label="Day of week"
                          value={scheduleCreateForm.dayOfWeek}
                          onChange={(e) =>
                            setScheduleCreateForm((prev) => ({
                              ...prev,
                              dayOfWeek: e.target.value,
                            }))
                          }
                          fullWidth
                        >
                          {daysOfWeek.map((day) => (
                            <MenuItem key={day.value} value={String(day.value)}>
                              {day.label}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 2,
                          }}
                        >
                          <TextField
                          label="Open time"
                          type="time"
                          value={scheduleCreateForm.openTime.slice(0, 5)}
                          onChange={(e) =>
                            setScheduleCreateForm((prev) => ({
                              ...prev,
                              openTime: `${e.target.value}:00`,
                            }))
                          }
                          inputProps={{ step: 1800 }}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />
                          <TextField
                          label="Close time"
                          type="time"
                          value={scheduleCreateForm.closeTime.slice(0, 5)}
                          onChange={(e) =>
                            setScheduleCreateForm((prev) => ({
                              ...prev,
                              closeTime: `${e.target.value}:00`,
                            }))
                          }
                          inputProps={{ step: 1800 }}
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />
                        </Box>

                        <TextField
                          label="Base slot minutes"
                          value="30"
                          disabled
                          helperText="System-defined internal grid resolution."
                          fullWidth
                        />

                        <TextField
                          label="Allowed durations"
                          value={scheduleCreateForm.allowedDurations}
                          onChange={(e) =>
                            setScheduleCreateForm((prev) => ({
                              ...prev,
                              allowedDurations: e.target.value,
                            }))
                          }
                          helperText="Example: 60,90,120"
                          fullWidth
                        />

                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => void createScheduleMutation.mutateAsync(scheduleCreateForm)}
                          disabled={isAnyScheduleMutationPending}
                        >
                          {createScheduleMutation.isPending
                            ? 'Creating...'
                            : 'Create schedule rule'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Stack spacing={2}>
                    {sortedSchedules.length === 0 ? (
                      <Alert severity="info">No schedule rules exist for this court yet.</Alert>
                    ) : (
                      sortedSchedules.map((rule) => {
                        const isEditing = scheduleEditingId === rule.id;
                        const form = isEditing ? scheduleEditForm : null;

                        return (
                          <Card key={rule.id} sx={{ borderRadius: 4 }}>
                            <CardContent>
                              {!isEditing || !form ? (
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    justifyContent="space-between"
                                    spacing={2}
                                  >
                                    <Box>
                                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {getDayLabel(rule.dayOfWeek)}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {rule.openTime} → {rule.closeTime}
                                      </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                      <Chip
                                        label={`${rule.baseSlotMinutes} min slots`}
                                        variant="outlined"
                                      />
                                      <Chip
                                        label={rule.isActive ? 'Active' : 'Inactive'}
                                        color={rule.isActive ? 'success' : 'default'}
                                      />
                                    </Stack>
                                  </Stack>

                                  <Typography variant="body2" color="text.secondary">
                                    Allowed durations: {rule.allowedDurations || 'Not specified'}
                                  </Typography>

                                  <Divider />

                                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                                    <Button
                                      variant="outlined"
                                      startIcon={<EditOutlinedIcon />}
                                      disabled={isAnyScheduleMutationPending}
                                      onClick={() => {
                                        setScheduleEditingId(rule.id);
                                        setScheduleEditForm(buildScheduleForm(rule));
                                        setSaveMessage(null);
                                        setErrorMessage(null);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      startIcon={<DeleteOutlineIcon />}
                                      disabled={isAnyScheduleMutationPending}
                                      onClick={() => void deleteScheduleMutation.mutateAsync(rule.id)}
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                </Stack>
                              ) : (
                                <Stack spacing={2}>
                                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Edit schedule rule
                                  </Typography>

                                  <TextField
                                    select
                                    label="Day of week"
                                    value={form.dayOfWeek}
                                    onChange={(e) =>
                                      setScheduleEditForm((prev) =>
                                        prev ? { ...prev, dayOfWeek: e.target.value } : prev
                                      )
                                    }
                                    fullWidth
                                  >
                                    {daysOfWeek.map((day) => (
                                      <MenuItem key={day.value} value={String(day.value)}>
                                        {day.label}
                                      </MenuItem>
                                    ))}
                                  </TextField>

                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: 2,
                                    }}
                                  >
                                    <TextField
                                      label="Open time"
                                      type="time"
                                      value={form.openTime.slice(0, 5)}
                                      onChange={(e) =>
                                        setScheduleEditForm((prev) =>
                                          prev ? { ...prev, openTime: `${e.target.value}:00` } : prev
                                        )
                                      }
                                      inputProps={{ step: 1800 }}
                                      InputLabelProps={{ shrink: true }}
                                      fullWidth
                                    />
                                    <TextField
                                      label="Close time"
                                      type="time"
                                      value={form.closeTime.slice(0, 5)}
                                      onChange={(e) =>
                                        setScheduleEditForm((prev) =>
                                          prev ? { ...prev, closeTime: `${e.target.value}:00` } : prev
                                        )
                                      }
                                      inputProps={{ step: 1800 }}
                                      InputLabelProps={{ shrink: true }}
                                      fullWidth
                                    />
                                  </Box>

                                  <TextField
                                    label="Base slot minutes"
                                    value="30"
                                    disabled
                                    helperText="System-defined internal grid resolution."
                                    fullWidth
                                  />

                                  <TextField
                                    label="Allowed durations"
                                    value={form.allowedDurations}
                                    onChange={(e) =>
                                      setScheduleEditForm((prev) =>
                                        prev ? { ...prev, allowedDurations: e.target.value } : prev
                                      )
                                    }
                                    fullWidth
                                  />

                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={form.isActive}
                                        onChange={(e) =>
                                          setScheduleEditForm((prev) =>
                                            prev ? { ...prev, isActive: e.target.checked } : prev
                                          )
                                        }
                                      />
                                    }
                                    label="Active"
                                  />

                                  <Stack direction="row" spacing={1.5}>
                                    <Button
                                      variant="contained"
                                      startIcon={<SaveIcon />}
                                      disabled={isAnyScheduleMutationPending}
                                      onClick={() =>
                                        void updateScheduleMutation.mutateAsync({
                                          id: rule.id,
                                          form,
                                        })
                                      }
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      disabled={isAnyScheduleMutationPending}
                                      onClick={() => {
                                        setScheduleEditingId(null);
                                        setScheduleEditForm(null);
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
              )}

              {tab === 1 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', xl: '420px 1fr' },
                    gap: 3,
                    alignItems: 'start',
                  }}
                >
                  <Card sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack spacing={2.5}>
                        <SectionHeader
                          icon={<AttachMoneyIcon />}
                          title="New price rule"
                          subtitle="Define pricing windows by day, time range, and booking duration."
                        />

                        <TextField
                          select
                          label="Day of week"
                          value={priceCreateForm.dayOfWeek}
                          onChange={(e) =>
                            setPriceCreateForm((prev) => ({
                              ...prev,
                              dayOfWeek: e.target.value,
                            }))
                          }
                          fullWidth
                        >
                          {daysOfWeek.map((day) => (
                            <MenuItem key={day.value} value={String(day.value)}>
                              {day.label}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <TextField
                            label="Start time"
                            value={priceCreateForm.startTime}
                            onChange={(e) =>
                              setPriceCreateForm((prev) => ({
                                ...prev,
                                startTime: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                          <TextField
                            label="End time"
                            value={priceCreateForm.endTime}
                            onChange={(e) =>
                              setPriceCreateForm((prev) => ({
                                ...prev,
                                endTime: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <TextField
                            label="Duration minutes"
                            value={priceCreateForm.durationMinutes}
                            onChange={(e) =>
                              setPriceCreateForm((prev) => ({
                                ...prev,
                                durationMinutes: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                          <TextField
                            label="Price"
                            value={priceCreateForm.price}
                            onChange={(e) =>
                              setPriceCreateForm((prev) => ({
                                ...prev,
                                price: e.target.value,
                              }))
                            }
                            fullWidth
                          />
                        </Box>

                        <TextField
                          label="Currency"
                          value={priceCreateForm.currency}
                          onChange={(e) =>
                            setPriceCreateForm((prev) => ({
                              ...prev,
                              currency: e.target.value,
                            }))
                          }
                          helperText="Default currency is Denars."
                          fullWidth
                        />

                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => void createPriceMutation.mutateAsync(priceCreateForm)}
                          disabled={isAnyPriceMutationPending}
                        >
                          {createPriceMutation.isPending ? 'Creating...' : 'Create price rule'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Stack spacing={2}>
                    {sortedPrices.length === 0 ? (
                      <Alert severity="info">No price rules exist for this court yet.</Alert>
                    ) : (
                      sortedPrices.map((rule) => {
                        const isEditing = priceEditingId === rule.id;
                        const form = isEditing ? priceEditForm : null;

                        return (
                          <Card key={rule.id} sx={{ borderRadius: 4 }}>
                            <CardContent>
                              {!isEditing || !form ? (
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    justifyContent="space-between"
                                    spacing={2}
                                  >
                                    <Box>
                                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {getDayLabel(rule.dayOfWeek)}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {rule.startTime} → {rule.endTime}
                                      </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                      <Chip
                                        label={`${rule.price} ${rule.currency || 'Denars'}`.trim()}
                                        color="primary"
                                        variant="outlined"
                                      />
                                      <Chip
                                        label={`${rule.durationMinutes} min`}
                                        variant="outlined"
                                      />
                                      <Chip
                                        label={rule.isActive ? 'Active' : 'Inactive'}
                                        color={rule.isActive ? 'success' : 'default'}
                                      />
                                    </Stack>
                                  </Stack>

                                  <Divider />

                                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                                    <Button
                                      variant="outlined"
                                      startIcon={<EditOutlinedIcon />}
                                      disabled={isAnyPriceMutationPending}
                                      onClick={() => {
                                        setPriceEditingId(rule.id);
                                        setPriceEditForm(buildPriceForm(rule));
                                        setSaveMessage(null);
                                        setErrorMessage(null);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      startIcon={<DeleteOutlineIcon />}
                                      disabled={isAnyPriceMutationPending}
                                      onClick={() => void deletePriceMutation.mutateAsync(rule.id)}
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                </Stack>
                              ) : (
                                <Stack spacing={2}>
                                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Edit price rule
                                  </Typography>

                                  <TextField
                                    select
                                    label="Day of week"
                                    value={form.dayOfWeek}
                                    onChange={(e) =>
                                      setPriceEditForm((prev) =>
                                        prev ? { ...prev, dayOfWeek: e.target.value } : prev
                                      )
                                    }
                                    fullWidth
                                  >
                                    {daysOfWeek.map((day) => (
                                      <MenuItem key={day.value} value={String(day.value)}>
                                        {day.label}
                                      </MenuItem>
                                    ))}
                                  </TextField>

                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: 2,
                                    }}
                                  >
                                    <TextField
                                      label="Start time"
                                      value={form.startTime}
                                      onChange={(e) =>
                                        setPriceEditForm((prev) =>
                                          prev ? { ...prev, startTime: e.target.value } : prev
                                        )
                                      }
                                      fullWidth
                                    />
                                    <TextField
                                      label="End time"
                                      value={form.endTime}
                                      onChange={(e) =>
                                        setPriceEditForm((prev) =>
                                          prev ? { ...prev, endTime: e.target.value } : prev
                                        )
                                      }
                                      fullWidth
                                    />
                                  </Box>

                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: 2,
                                    }}
                                  >
                                    <TextField
                                      label="Duration minutes"
                                      value={form.durationMinutes}
                                      onChange={(e) =>
                                        setPriceEditForm((prev) =>
                                          prev ? { ...prev, durationMinutes: e.target.value } : prev
                                        )
                                      }
                                      fullWidth
                                    />
                                    <TextField
                                      label="Price"
                                      value={form.price}
                                      onChange={(e) =>
                                        setPriceEditForm((prev) =>
                                          prev ? { ...prev, price: e.target.value } : prev
                                        )
                                      }
                                      fullWidth
                                    />
                                  </Box>

                                  <TextField
                                    label="Currency"
                                    value={form.currency}
                                    onChange={(e) =>
                                      setPriceEditForm((prev) =>
                                        prev ? { ...prev, currency: e.target.value } : prev
                                      )
                                    }
                                    helperText="Default currency is Denars."
                                    fullWidth
                                  />

                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={form.isActive}
                                        onChange={(e) =>
                                          setPriceEditForm((prev) =>
                                            prev ? { ...prev, isActive: e.target.checked } : prev
                                          )
                                        }
                                      />
                                    }
                                    label="Active"
                                  />

                                  <Stack direction="row" spacing={1.5}>
                                    <Button
                                      variant="contained"
                                      startIcon={<SaveIcon />}
                                      disabled={isAnyPriceMutationPending}
                                      onClick={() =>
                                        void updatePriceMutation.mutateAsync({
                                          id: rule.id,
                                          form,
                                        })
                                      }
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      disabled={isAnyPriceMutationPending}
                                      onClick={() => {
                                        setPriceEditingId(null);
                                        setPriceEditForm(null);
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
              )}

              {tab === 2 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', xl: '420px 1fr' },
                    gap: 3,
                    alignItems: 'start',
                  }}
                >
                  <Card sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack spacing={2.5}>
                        <SectionHeader
                          icon={<BlockIcon />}
                          title="New block"
                          subtitle="Temporarily close the court for maintenance, events, or private use."
                        />

                        <TextField
                          label="Start"
                          type="datetime-local"
                          value={blockCreateForm.startUtc}
                          onChange={(e) =>
                            setBlockCreateForm((prev) => ({
                              ...prev,
                              startUtc: e.target.value,
                            }))
                          }
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />

                        <TextField
                          label="End"
                          type="datetime-local"
                          value={blockCreateForm.endUtc}
                          onChange={(e) =>
                            setBlockCreateForm((prev) => ({
                              ...prev,
                              endUtc: e.target.value,
                            }))
                          }
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />

                        <TextField
                          label="Reason"
                          value={blockCreateForm.reason}
                          onChange={(e) =>
                            setBlockCreateForm((prev) => ({
                              ...prev,
                              reason: e.target.value,
                            }))
                          }
                          multiline
                          minRows={3}
                          fullWidth
                        />

                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => void createBlockMutation.mutateAsync(blockCreateForm)}
                          disabled={isAnyBlockMutationPending}
                        >
                          {createBlockMutation.isPending ? 'Creating...' : 'Create block'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Stack spacing={2}>
                    {sortedBlocks.length === 0 ? (
                      <Alert severity="info">No blocks exist for this court yet.</Alert>
                    ) : (
                      sortedBlocks.map((block) => {
                        const isEditing = blockEditingId === block.id;
                        const form = isEditing ? blockEditForm : null;

                        return (
                          <Card key={block.id} sx={{ borderRadius: 4 }}>
                            <CardContent>
                              {!isEditing || !form ? (
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    justifyContent="space-between"
                                    spacing={2}
                                  >
                                    <Box>
                                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {formatLocalDateTime(block.startUtc)}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        until {formatLocalDateTime(block.endUtc)}
                                      </Typography>
                                    </Box>

                                    <Chip
                                      label={`Created by user ${block.createdByUserId}`}
                                      variant="outlined"
                                    />
                                  </Stack>

                                  <Typography variant="body2" color="text.secondary">
                                    {block.reason || 'No reason specified'}
                                  </Typography>

                                  <Divider />

                                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                                    <Button
                                      variant="outlined"
                                      startIcon={<EditOutlinedIcon />}
                                      disabled={isAnyBlockMutationPending}
                                      onClick={() => {
                                        setBlockEditingId(block.id);
                                        setBlockEditForm(buildBlockForm(block));
                                        setSaveMessage(null);
                                        setErrorMessage(null);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      startIcon={<DeleteOutlineIcon />}
                                      disabled={isAnyBlockMutationPending}
                                      onClick={() => void deleteBlockMutation.mutateAsync(block.id)}
                                    >
                                      Delete
                                    </Button>
                                  </Stack>
                                </Stack>
                              ) : (
                                <Stack spacing={2}>
                                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Edit block
                                  </Typography>

                                  <TextField
                                    label="Start"
                                    type="datetime-local"
                                    value={form.startUtc}
                                    onChange={(e) =>
                                      setBlockEditForm((prev) =>
                                        prev ? { ...prev, startUtc: e.target.value } : prev
                                      )
                                    }
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                  />

                                  <TextField
                                    label="End"
                                    type="datetime-local"
                                    value={form.endUtc}
                                    onChange={(e) =>
                                      setBlockEditForm((prev) =>
                                        prev ? { ...prev, endUtc: e.target.value } : prev
                                      )
                                    }
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                  />

                                  <TextField
                                    label="Reason"
                                    value={form.reason}
                                    onChange={(e) =>
                                      setBlockEditForm((prev) =>
                                        prev ? { ...prev, reason: e.target.value } : prev
                                      )
                                    }
                                    multiline
                                    minRows={3}
                                    fullWidth
                                  />

                                  <Stack direction="row" spacing={1.5}>
                                    <Button
                                      variant="contained"
                                      startIcon={<SaveIcon />}
                                      disabled={isAnyBlockMutationPending}
                                      onClick={() =>
                                        void updateBlockMutation.mutateAsync({
                                          id: block.id,
                                          form,
                                        })
                                      }
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      disabled={isAnyBlockMutationPending}
                                      onClick={() => {
                                        setBlockEditingId(null);
                                        setBlockEditForm(null);
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
              )}
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}