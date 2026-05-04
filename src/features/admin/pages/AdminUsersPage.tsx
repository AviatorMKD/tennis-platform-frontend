import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AdminUserDto,
  getAdminUsers,
  updateAdminUser,
} from '../../../api/adminUsers.api';
import { useAuth } from '../../../auth/useAuth';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

type EditableUserForm = {
  firstName: string;
  lastName: string;
  phone: string;
  birthYear: string;
  gender: string;
  experienceLevel: string;
  isCoach: boolean;
  role: string;
  isActive: boolean;
};

function getUserDisplayName(user: AdminUserDto): string {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName.length > 0) return fullName;
  if (user.username && user.username.trim().length > 0) return user.username.trim();
  return user.email;
}

function buildForm(user: AdminUserDto): EditableUserForm {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
    birthYear: user.birthYear?.toString() ?? '',
    gender: user.gender ?? '',
    experienceLevel: user.experienceLevel?.toString() ?? '',
    isCoach: user.isCoach,
    role: user.role ?? 'User',
    isActive: user.isActive,
  };
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isSystemAdmin = user?.role === 'SystemAdmin';

  const [searchText, setSearchText] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [draftSelectedUserId, setDraftSelectedUserId] = useState<number | null>(null);
  const [draftForm, setDraftForm] = useState<EditableUserForm | null>(null);
  const [draftFormUserId, setDraftFormUserId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 60_000,
  });

  const users = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return users.filter((item) => {
      if (!showInactive && !item.isActive) return false;

      if (!q) return true;

      const haystack = [
        item.email,
        item.firstName,
        item.lastName,
        item.username,
        item.phone,
        item.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [users, searchText, showInactive]);

  const selectedUserId = useMemo(() => {
    if (
      draftSelectedUserId != null &&
      filteredUsers.some((item) => item.id === draftSelectedUserId)
    ) {
      return draftSelectedUserId;
    }

    return filteredUsers.length > 0 ? filteredUsers[0].id : null;
  }, [draftSelectedUserId, filteredUsers]);

  const selectedUser = useMemo(() => {
    if (selectedUserId == null) return null;
    return users.find((x) => x.id === selectedUserId) ?? null;
  }, [users, selectedUserId]);

  const effectiveForm = useMemo(() => {
    if (!selectedUser) {
      return null;
    }

    if (draftForm && draftFormUserId === selectedUser.id) {
      return draftForm;
    }

    return buildForm(selectedUser);
  }, [selectedUser, draftForm, draftFormUserId]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; form: EditableUserForm }) => {
      const birthYearValue =
        payload.form.birthYear.trim() === ''
          ? null
          : Number(payload.form.birthYear.trim());

      const experienceLevelValue =
        payload.form.experienceLevel.trim() === ''
          ? null
          : Number(payload.form.experienceLevel.trim());

      if (birthYearValue !== null && Number.isNaN(birthYearValue)) {
        throw new Error('Birth year must be a valid number.');
      }

      if (experienceLevelValue !== null && Number.isNaN(experienceLevelValue)) {
        throw new Error('Experience level must be a valid number.');
      }

      return updateAdminUser(payload.id, {
        firstName: payload.form.firstName.trim(),
        lastName: payload.form.lastName.trim(),
        phone: payload.form.phone.trim(),
        birthYear: birthYearValue,
        gender: payload.form.gender.trim() === '' ? null : payload.form.gender.trim(),
        experienceLevel: experienceLevelValue,
        isCoach: payload.form.isCoach,
        role: payload.form.role,
        isActive: payload.form.isActive,
      });
    },
    onSuccess: async (result) => {
      setSaveMessage(result.message || 'User updated successfully.');
      setErrorMessage(null);
      setDraftSelectedUserId(result.user.id);
      setDraftForm(null);
      setDraftFormUserId(null);

      await queryClient.invalidateQueries({
        queryKey: ['admin-users'],
      });

      queryClient.setQueryData<AdminUserDto[] | undefined>(['admin-users'], (previous) => {
        if (!previous) {
          return previous;
        }

        return previous.map((item) => (item.id === result.user.id ? result.user : item));
      });
    },
    onError: (error: unknown) => {
      setSaveMessage(null);
      setErrorMessage(
        extractApiErrorMessage(error, 'Failed to update user.'),
      );
    },
  });

  const handleSelectUser = (userId: number) => {
    const nextUser = users.find((item) => item.id === userId) ?? null;

    setDraftSelectedUserId(userId);
    setDraftForm(nextUser ? buildForm(nextUser) : null);
    setDraftFormUserId(nextUser?.id ?? null);
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleFieldChange = (
    field: keyof EditableUserForm,
    value: string | boolean
  ) => {
    if (!selectedUser || !effectiveForm) {
      return;
    }

    setDraftForm({
      ...effectiveForm,
      [field]: value,
    });
    setDraftFormUserId(selectedUser.id);
    setSaveMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!selectedUser || !effectiveForm) {
      setErrorMessage('No user selected.');
      setSaveMessage(null);
      return;
    }

    if (effectiveForm.firstName.trim() === '') {
      setErrorMessage('First name is required.');
      setSaveMessage(null);
      return;
    }

    if (effectiveForm.lastName.trim() === '') {
      setErrorMessage('Last name is required.');
      setSaveMessage(null);
      return;
    }

    if (effectiveForm.phone.trim() === '') {
      setErrorMessage('Phone is required.');
      setSaveMessage(null);
      return;
    }

    if (!['User', 'SystemAdmin'].includes(effectiveForm.role)) {
      setErrorMessage('Role must be either User or SystemAdmin.');
      setSaveMessage(null);
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    await updateMutation.mutateAsync({
      id: selectedUser.id,
      form: effectiveForm,
    });
  };

  const handleRefresh = () => {
    void usersQuery.refetch();
  };

  const handleReset = () => {
    if (!selectedUser) {
      return;
    }

    setDraftForm(buildForm(selectedUser));
    setDraftFormUserId(selectedUser.id);
    setSaveMessage(null);
    setErrorMessage(null);
  };

  if (!isSystemAdmin) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error">Only SystemAdmin can access this page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review users, edit their profile/admin fields, activate or deactivate
            accounts, and manage system-level roles.
          </Typography>
        </Box>

        {saveMessage && <Alert severity="success">{saveMessage}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {usersQuery.isError && (
          <Alert severity="error">
            {extractApiErrorMessage(usersQuery.error, 'Failed to load users.')}
          </Alert>
        )}

        {usersQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
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
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Users
                  </Typography>

                  <TextField
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    label="Search users"
                    placeholder="Name, email, username, phone, role..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                      />
                    }
                    label="Show inactive users"
                  />

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefresh}
                      disabled={updateMutation.isPending}
                    >
                      Refresh
                    </Button>
                    <Chip
                      label={`${filteredUsers.length} users`}
                      variant="outlined"
                    />
                  </Box>

                  <Divider />

                  {filteredUsers.length === 0 ? (
                    <Alert severity="info">No users match the current filter.</Alert>
                  ) : (
                    <List disablePadding sx={{ maxHeight: 700, overflowY: 'auto' }}>
                      {filteredUsers.map((item, index) => (
                        <Box key={item.id}>
                          <ListItemButton
                            selected={selectedUserId === item.id}
                            onClick={() => handleSelectUser(item.id)}
                            alignItems="flex-start"
                            sx={{ borderRadius: 1, py: 1.5 }}
                          >
                            <ListItemText
                              primary={
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  flexWrap="wrap"
                                >
                                  <Typography sx={{ fontWeight: 600 }}>
                                    {getUserDisplayName(item)}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={item.role ?? 'User'}
                                    variant="outlined"
                                  />
                                  <Chip
                                    size="small"
                                    label={item.isActive ? 'Active' : 'Inactive'}
                                    color={item.isActive ? 'success' : 'default'}
                                  />
                                </Stack>
                              }
                              secondary={
                                <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.email}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Username: {item.username ?? '-'} | ID: {item.id}
                                  </Typography>
                                </Stack>
                              }
                            />
                          </ListItemButton>

                          {index < filteredUsers.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                {!selectedUser || !effectiveForm ? (
                  <Alert severity="info">Select a user to view and edit details.</Alert>
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Edit User
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Update profile, status, and role values for the selected user.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip label={`ID: ${selectedUser.id}`} variant="outlined" />
                      <Chip
                        label={selectedUser.isActive ? 'Active' : 'Inactive'}
                        color={selectedUser.isActive ? 'success' : 'default'}
                      />
                      <Chip
                        label={
                          selectedUser.emailVerifiedUtc ? 'Email Verified' : 'Email Not Verified'
                        }
                        color={selectedUser.emailVerifiedUtc ? 'success' : 'warning'}
                        variant={selectedUser.emailVerifiedUtc ? 'filled' : 'outlined'}
                      />
                    </Stack>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="First name"
                        value={effectiveForm.firstName}
                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Last name"
                        value={effectiveForm.lastName}
                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Phone"
                        value={effectiveForm.phone}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Birth year"
                        value={effectiveForm.birthYear}
                        onChange={(e) => handleFieldChange('birthYear', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Gender"
                        value={effectiveForm.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Experience level"
                        value={effectiveForm.experienceLevel}
                        onChange={(e) => handleFieldChange('experienceLevel', e.target.value)}
                        fullWidth
                      />

                      <TextField
                        label="Role"
                        select
                        value={effectiveForm.role}
                        onChange={(e) => handleFieldChange('role', e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="User">User</MenuItem>
                        <MenuItem value="SystemAdmin">SystemAdmin</MenuItem>
                      </TextField>

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          minHeight: 56,
                        }}
                      >
                        <Stack direction="row" spacing={3} flexWrap="wrap">
                          <FormControlLabel
                            control={
                              <Switch
                                checked={effectiveForm.isCoach}
                                onChange={(e) =>
                                  handleFieldChange('isCoach', e.target.checked)
                                }
                              />
                            }
                            label="Coach"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={effectiveForm.isActive}
                                onChange={(e) =>
                                  handleFieldChange('isActive', e.target.checked)
                                }
                              />
                            }
                            label="Active"
                          />
                        </Stack>
                      </Box>
                    </Box>

                    <Divider />

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="Email"
                        value={selectedUser.email}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />

                      <TextField
                        label="Username"
                        value={selectedUser.username ?? ''}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />

                      <TextField
                        label="Created UTC"
                        value={new Date(selectedUser.createdUtc).toLocaleString()}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />

                      <TextField
                        label="Email verified UTC"
                        value={
                          selectedUser.emailVerifiedUtc
                            ? new Date(selectedUser.emailVerifiedUtc).toLocaleString()
                            : ''
                        }
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />

                      <TextField
                        label="Last verification email sent UTC"
                        value={
                          selectedUser.lastVerificationEmailSentUtc
                            ? new Date(
                                selectedUser.lastVerificationEmailSentUtc
                              ).toLocaleString()
                            : ''
                        }
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />

                      <TextField
                        label="Last password reset email sent UTC"
                        value={
                          selectedUser.lastPasswordResetEmailSentUtc
                            ? new Date(
                                selectedUser.lastPasswordResetEmailSentUtc
                              ).toLocaleString()
                            : ''
                        }
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Box>

                    <Divider />

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={`Completed: ${selectedUser.completedCount}`}
                        variant="outlined"
                      />
                      <Chip
                        label={`Cancelled: ${selectedUser.cancelledCount}`}
                        variant="outlined"
                      />
                      <Chip
                        label={`No-show: ${selectedUser.noShowCount}`}
                        variant="outlined"
                      />
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={() => void handleSave()}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                      </Button>

                      <Button
                        variant="outlined"
                        onClick={handleReset}
                        disabled={updateMutation.isPending}
                      >
                        Reset form
                      </Button>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Stack>
    </Box>
  );
}