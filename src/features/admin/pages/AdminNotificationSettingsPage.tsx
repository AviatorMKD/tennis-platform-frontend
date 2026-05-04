import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingsDto,
  type UpdateNotificationSettingsRequest,
} from '../../../api/adminNotificationSettings.api';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

export function AdminNotificationSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: getNotificationSettings,
  });

  const [draftState, setDraftState] = useState<NotificationSettingsDto | null>(null);

  const effectiveState = useMemo(() => {
    return draftState ?? data ?? null;
  }, [draftState, data]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateNotificationSettingsRequest) => updateNotificationSettings(payload),
    onSuccess: async (updatedSettings) => {
      setDraftState(null);

      await queryClient.invalidateQueries({
        queryKey: ['notification-settings'],
      });

      queryClient.setQueryData(['notification-settings'], updatedSettings);
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !effectiveState) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', mt: 4 }}>
        <Alert severity="error">
          {extractApiErrorMessage(error, 'Failed to load notification settings.')}
        </Alert>
      </Box>
    );
  }

  const handleToggle = (key: keyof NotificationSettingsDto) => {
    setDraftState((prev) => {
      const source = prev ?? effectiveState;

      return {
        ...source,
        [key]: !source[key],
      };
    });
  };

  const handleSave = () => {
    const payload: UpdateNotificationSettingsRequest = {
      sendEmailVerification: effectiveState.sendEmailVerification,
      sendPasswordReset: effectiveState.sendPasswordReset,

      sendBookingCreatedToOwnerAndOperators:
        effectiveState.sendBookingCreatedToOwnerAndOperators,
      sendBookingConfirmedToOwnerAndOperators:
        effectiveState.sendBookingConfirmedToOwnerAndOperators,
      sendBookingConfirmedToParticipants:
        effectiveState.sendBookingConfirmedToParticipants,

      sendBookingCancelledToOwnerAndOperators:
        effectiveState.sendBookingCancelledToOwnerAndOperators,
      sendBookingCancelledToParticipants:
        effectiveState.sendBookingCancelledToParticipants,

      sendBookingAutoCancelledToOwnerAndOperators:
        effectiveState.sendBookingAutoCancelledToOwnerAndOperators,
      sendBookingAutoCancelledToParticipants:
        effectiveState.sendBookingAutoCancelledToParticipants,

      sendBookingInvitationSent: effectiveState.sendBookingInvitationSent,
    };

    mutation.mutate(payload);
  };

  const handleReset = () => {
    setDraftState(null);
  };

  const hasUnsavedChanges =
    draftState != null &&
    JSON.stringify(draftState) !== JSON.stringify(data ?? null);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <Paper sx={{ width: '100%', maxWidth: 760, p: 4 }}>
        <Stack spacing={3}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Notification Settings
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendEmailVerification}
                onChange={() => handleToggle('sendEmailVerification')}
              />
            }
            label="Email Verification"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendPasswordReset}
                onChange={() => handleToggle('sendPasswordReset')}
              />
            }
            label="Password Reset Emails"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingCreatedToOwnerAndOperators}
                onChange={() => handleToggle('sendBookingCreatedToOwnerAndOperators')}
              />
            }
            label="Booking Created — Owner and Club Operators"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingConfirmedToOwnerAndOperators}
                onChange={() => handleToggle('sendBookingConfirmedToOwnerAndOperators')}
              />
            }
            label="Booking Confirmed — Owner and Club Operators"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingConfirmedToParticipants}
                onChange={() => handleToggle('sendBookingConfirmedToParticipants')}
              />
            }
            label="Booking Confirmed — Participants"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingCancelledToOwnerAndOperators}
                onChange={() => handleToggle('sendBookingCancelledToOwnerAndOperators')}
              />
            }
            label="Manual Cancellation — Owner and Club Operators"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingCancelledToParticipants}
                onChange={() => handleToggle('sendBookingCancelledToParticipants')}
              />
            }
            label="Manual Cancellation — Participants"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingAutoCancelledToOwnerAndOperators}
                onChange={() => handleToggle('sendBookingAutoCancelledToOwnerAndOperators')}
              />
            }
            label="Auto Cancellation — Owner and Club Operators"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingAutoCancelledToParticipants}
                onChange={() => handleToggle('sendBookingAutoCancelledToParticipants')}
              />
            }
            label="Auto Cancellation — Participants"
          />

          <FormControlLabel
            control={
              <Switch
                checked={effectiveState.sendBookingInvitationSent}
                onChange={() => handleToggle('sendBookingInvitationSent')}
              />
            }
            label="Invitation Emails"
          />

          {mutation.isSuccess && (
            <Alert severity="success">Settings saved.</Alert>
          )}

          {mutation.isError && (
            <Alert severity="error">
              {extractApiErrorMessage(mutation.error, 'Failed to save settings.')}
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={mutation.isPending || !hasUnsavedChanges}
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={mutation.isPending || !hasUnsavedChanges}
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}