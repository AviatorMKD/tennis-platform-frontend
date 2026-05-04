import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClubById,
  updateClub,
  type ClubSummary,
  type UpdateClubRequest,
} from '../../../api/operatorDashboard.api';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import { ClubMediaManager } from '../components/ClubMediaManager';

type ClubFormState = {
  name: string;
  description: string;
  phone: string;
  secondaryPhone: string;
  addressLine1: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  pointOfContactName: string;
  logoMediaFileId: string;
  playerRequirementCutoffHours: string;
  operatingOpenTime: string;
  operatingCloseTime: string;
  isActive: boolean;
};

function normalizeTime(value: string | null | undefined) {
  if (!value) return '08:00:00';
  return value.length === 5 ? `${value}:00` : value;
}

function buildForm(club: ClubSummary): ClubFormState {
  return {
    name: club.name ?? '',
    description: club.description ?? '',
    phone: club.phone ?? '',
    secondaryPhone: club.secondaryPhone ?? '',
    addressLine1: club.addressLine1 ?? '',
    city: club.city ?? '',
    country: club.country ?? '',
    latitude: club.latitude != null ? String(club.latitude) : '',
    longitude: club.longitude != null ? String(club.longitude) : '',
    pointOfContactName: club.pointOfContactName ?? '',
    logoMediaFileId: club.logoMediaFileId != null ? String(club.logoMediaFileId) : '',
    playerRequirementCutoffHours:
      club.playerRequirementCutoffHours != null ? String(club.playerRequirementCutoffHours) : '',
    operatingOpenTime: normalizeTime(club.operatingOpenTime),
    operatingCloseTime: normalizeTime(club.operatingCloseTime),
    isActive: club.isActive,
  };
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      'Latitude, longitude, logo media file ID, and cutoff hours must be valid numbers.'
    );
  }

  return parsed;
}

function toNullableInteger(value: string) {
  const parsed = toNullableNumber(value);
  if (parsed == null) return null;

  if (!Number.isInteger(parsed)) {
    throw new Error('Logo media file ID and cutoff hours must be whole numbers.');
  }

  return parsed;
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

function buildPayload(form: ClubFormState): UpdateClubRequest {
  if (form.name.trim() === '') throw new Error('Club name is required.');
  if (form.phone.trim() === '') throw new Error('Phone is required.');
  if (form.addressLine1.trim() === '') throw new Error('Address is required.');
  if (form.city.trim() === '') throw new Error('City is required.');
  if (form.country.trim() === '') throw new Error('Country is required.');

  const openMinutes = parseTimeToMinutes(form.operatingOpenTime);
  const closeMinutes = parseTimeToMinutes(form.operatingCloseTime);

  if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) {
    throw new Error('Operating open and close times must be valid.');
  }

  if (openMinutes >= closeMinutes) {
    throw new Error('Operating close time must be later than operating open time.');
  }

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    phone: form.phone.trim(),
    secondaryPhone: form.secondaryPhone.trim() || null,
    addressLine1: form.addressLine1.trim(),
    city: form.city.trim(),
    country: form.country.trim(),
    latitude: toNullableNumber(form.latitude),
    longitude: toNullableNumber(form.longitude),
    pointOfContactName: form.pointOfContactName.trim() || null,
    logoMediaFileId: toNullableInteger(form.logoMediaFileId),
    playerRequirementCutoffHours: toNullableInteger(form.playerRequirementCutoffHours),
    operatingOpenTime: normalizeTime(form.operatingOpenTime),
    operatingCloseTime: normalizeTime(form.operatingCloseTime),
    isActive: form.isActive,
  };
}

type RichTextDescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function RichTextDescriptionEditor({ value, onChange }: RichTextDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        'aria-label': 'Club description rich text editor',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    const nextHtml = value || '';

    if (currentHtml !== nextHtml) {
      editor.commands.setContent(nextHtml, {
          emitUpdate: false,
        });
    }
  }, [editor, value]);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        sx={{
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Tooltip title="Bold">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              color={editor?.isActive('bold') ? 'primary' : 'default'}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <FormatBoldIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Italic">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              color={editor?.isActive('italic') ? 'primary' : 'default'}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <FormatItalicIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />

        <Tooltip title="Bullet list">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              color={editor?.isActive('bulletList') ? 'primary' : 'default'}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <FormatListBulletedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Numbered list">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              color={editor?.isActive('orderedList') ? 'primary' : 'default'}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <FormatListNumberedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Quote">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              color={editor?.isActive('blockquote') ? 'primary' : 'default'}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <FormatQuoteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />

        <Tooltip title="Undo">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Redo">
          <span>
            <IconButton
              size="small"
              disabled={!editor}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <RedoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box
        sx={{
          minHeight: 180,
          p: 2,
          '& .tiptap': {
            outline: 'none',
            minHeight: 150,
          },
          '& .tiptap p': {
            my: 1,
          },
          '& .tiptap ul, & .tiptap ol': {
            pl: 3,
          },
          '& .tiptap blockquote': {
            borderLeft: '4px solid',
            borderColor: 'divider',
            pl: 2,
            ml: 0,
            color: 'text.secondary',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}

export function OperatorClubDetailsEditPage() {
  const { clubId } = useParams();
  const parsedClubId = Number(clubId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState<ClubFormState | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const clubQuery = useQuery({
    queryKey: ['operator-club', parsedClubId],
    queryFn: () => getClubById(parsedClubId),
    enabled: Number.isFinite(parsedClubId) && parsedClubId > 0,
  });

  const initializedForm = form ?? (clubQuery.data ? buildForm(clubQuery.data) : null);

  const updateMutation = useMutation({
    mutationFn: async (currentForm: ClubFormState) => {
      const payload = buildPayload(currentForm);
      return updateClub(parsedClubId, payload);
    },
    onSuccess: async (updatedClub) => {
      setForm(buildForm(updatedClub));
      setSaveMessage('Club details updated successfully.');
      setErrorMessage('');

      await queryClient.invalidateQueries({ queryKey: ['operator-club', parsedClubId] });
      await queryClient.invalidateQueries({ queryKey: ['operator-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      await queryClient.invalidateQueries({ queryKey: ['club-booking-discovery', parsedClubId] });
    },
    onError: (error: unknown) => {
      setSaveMessage('');
      setErrorMessage(extractApiErrorMessage(error, 'Failed to update club details.'));
    },
  });

  const handleFieldChange = (field: keyof ClubFormState, value: string | boolean) => {
    setForm((prev) => {
      const current = prev ?? (clubQuery.data ? buildForm(clubQuery.data) : null);

      if (!current) {
        return prev;
      }

      return {
        ...current,
        [field]: value,
      };
    });

    setSaveMessage('');
    setErrorMessage('');
  };

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
                  <BusinessIcon />
                  <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                    Club profile operations
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
                    Edit Club Details
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      maxWidth: 1000,
                      opacity: 0.92,
                      fontSize: { xs: 18, md: 20 },
                    }}
                  >
                    Update the club identity, contact details, location, general operating hours, and booking-related configuration.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={clubQuery.data?.name || `Club #${parsedClubId}`}
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

          {clubQuery.isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <Typography>Loading club details...</Typography>
            </Box>
          )}

          {clubQuery.isError && <Alert severity="error">Failed to load club details.</Alert>}

          {!clubQuery.isLoading && !clubQuery.isError && initializedForm && (
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                  >
                    <Button
                      component={RouterLink}
                      to="/operator"
                      variant="outlined"
                      startIcon={<ArrowBackIcon />}
                    >
                      Back to dashboard
                    </Button>

                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={updateMutation.isPending}
                      onClick={() => void updateMutation.mutateAsync(initializedForm)}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save club details'}
                    </Button>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Club name"
                      value={initializedForm.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Point of contact"
                      value={initializedForm.pointOfContactName}
                      onChange={(e) => handleFieldChange('pointOfContactName', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Phone"
                      value={initializedForm.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Secondary phone"
                      value={initializedForm.secondaryPhone}
                      onChange={(e) => handleFieldChange('secondaryPhone', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Address"
                      value={initializedForm.addressLine1}
                      onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="City"
                      value={initializedForm.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Country"
                      value={initializedForm.country}
                      onChange={(e) => handleFieldChange('country', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Player requirement cutoff hours"
                      value={initializedForm.playerRequirementCutoffHours}
                      onChange={(e) =>
                        handleFieldChange('playerRequirementCutoffHours', e.target.value)
                      }
                      fullWidth
                    />

                    <TextField
                      label="Operating open time"
                      value={initializedForm.operatingOpenTime}
                      onChange={(e) => handleFieldChange('operatingOpenTime', e.target.value)}
                      helperText="Example: 08:00:00"
                      fullWidth
                    />

                    <TextField
                      label="Operating close time"
                      value={initializedForm.operatingCloseTime}
                      onChange={(e) => handleFieldChange('operatingCloseTime', e.target.value)}
                      helperText="Example: 22:00:00"
                      fullWidth
                    />

                    <TextField
                      label="Latitude"
                      value={initializedForm.latitude}
                      onChange={(e) => handleFieldChange('latitude', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Longitude"
                      value={initializedForm.longitude}
                      onChange={(e) => handleFieldChange('longitude', e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Logo media file ID"
                      value={initializedForm.logoMediaFileId}
                      onChange={(e) => handleFieldChange('logoMediaFileId', e.target.value)}
                      fullWidth
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                      Description
                    </Typography>

                    <RichTextDescriptionEditor
                      value={initializedForm.description}
                      onChange={(value) => handleFieldChange('description', value)}
                    />

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      This description supports rich text and will be shown on the public club details page.
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={initializedForm.isActive}
                        onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                      />
                    }
                    label="Active club"
                  />

                  <ClubMediaManager clubId={parsedClubId} />

                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={updateMutation.isPending}
                      onClick={() => void updateMutation.mutateAsync(initializedForm)}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save club details'}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/operator/clubs/${parsedClubId}/courts`)}
                    >
                      Manage courts
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  );
}