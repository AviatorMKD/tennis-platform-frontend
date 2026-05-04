import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AdminUserSummary,
  type ClubOperatorSummary,
  type ClubSummary,
  createClubOperator,
  getAdminUsers,
  getClubOperatorsByClubId,
  getClubs,
  removeClubOperator,
} from '../../../api/adminClubOperators.api';
import { useAuth } from '../../../auth/useAuth';

function getUserDisplayName(user: AdminUserSummary): string {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName.length > 0) return fullName;
  if (user.username && user.username.trim().length > 0) return user.username.trim();
  return user.email;
}

function getClubDisplayName(club: ClubSummary): string {
  const name = club.name?.trim();
  if (name) return name;

  const city = club.city?.trim();
  if (city) return `Club #${club.id} (${city})`;

  return `Club #${club.id}`;
}

export function AdminClubOperatorsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isSystemAdmin = user?.role === 'SystemAdmin';

  const [selectedClub, setSelectedClub] = useState<ClubSummary | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [includeInactiveUsers, setIncludeInactiveUsers] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 60_000,
  });

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: getClubs,
    staleTime: 60_000,
  });

  const operatorsQuery = useQuery({
    queryKey: ['club-operators', selectedClub?.id],
    queryFn: () => getClubOperatorsByClubId(selectedClub!.id),
    enabled: !!selectedClub?.id,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { clubId: number; userId: number }) =>
      createClubOperator({
        clubId: payload.clubId,
        userId: payload.userId,
        isPrimary: false,
      }),
    onSuccess: async () => {
      setSaveMessage('Club operator assigned successfully.');
      setErrorMessage(null);
      setSelectedUser(null);

      await queryClient.invalidateQueries({
        queryKey: ['club-operators', selectedClub?.id],
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to assign club operator.';
      setSaveMessage(null);
      setErrorMessage(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (operatorId: number) => removeClubOperator(operatorId),
    onSuccess: async () => {
      setSaveMessage('Club operator removed successfully.');
      setErrorMessage(null);

      await queryClient.invalidateQueries({
        queryKey: ['club-operators', selectedClub?.id],
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to remove club operator.';
      setSaveMessage(null);
      setErrorMessage(message);
    },
  });

  const users = usersQuery.data ?? [];
  const clubs = clubsQuery.data ?? [];
  const operators = operatorsQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    return users.filter((item) => (includeInactiveUsers ? true : item.isActive));
  }, [includeInactiveUsers, users]);

  const operatorUserIds = useMemo(() => {
    return new Set(operators.map((item) => item.userId));
  }, [operators]);

  const assignableUsers = useMemo(() => {
    return filteredUsers.filter((item) => !operatorUserIds.has(item.id));
  }, [filteredUsers, operatorUserIds]);

  const operatorUsersById = useMemo(() => {
    const map = new Map<number, AdminUserSummary>();
    for (const item of users) {
      map.set(item.id, item);
    }
    return map;
  }, [users]);

  const handleAssign = async () => {
    if (!selectedClub) {
      setErrorMessage('Please select a club first.');
      setSaveMessage(null);
      return;
    }

    if (!selectedUser) {
      setErrorMessage('Please select a user to assign.');
      setSaveMessage(null);
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    await createMutation.mutateAsync({
      clubId: selectedClub.id,
      userId: selectedUser.id,
    });
  };

  const handleRemove = async (operator: ClubOperatorSummary) => {
    setErrorMessage(null);
    setSaveMessage(null);
    await removeMutation.mutateAsync(operator.id);
  };

  const handleRefresh = () => {
    void usersQuery.refetch();
    void clubsQuery.refetch();

    if (selectedClub) {
      void operatorsQuery.refetch();
    }
  };

  if (!isSystemAdmin) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error">Only SystemAdmin can access this page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Club Operator Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Assign users as club operators and remove assignments when needed.
          </Typography>
        </Box>

        {saveMessage && <Alert severity="success">{saveMessage}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {usersQuery.isError && (
          <Alert severity="error">
            Failed to load users.
          </Alert>
        )}

        {clubsQuery.isError && (
          <Alert severity="error">
            Failed to load clubs.
          </Alert>
        )}

        {operatorsQuery.isError && selectedClub && (
          <Alert severity="error">
            Failed to load operators for the selected club.
          </Alert>
        )}

        {(usersQuery.isLoading || clubsQuery.isLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!usersQuery.isLoading && !clubsQuery.isLoading && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(340px, 420px) 1fr' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Assign Operator
                  </Typography>

                  <Autocomplete
                    options={clubs}
                    value={selectedClub}
                    onChange={(_, value) => {
                      setSelectedClub(value);
                      setSelectedUser(null);
                      setSaveMessage(null);
                      setErrorMessage(null);
                    }}
                    getOptionLabel={getClubDisplayName}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField {...params} label="Select club" />
                    )}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeInactiveUsers}
                        onChange={(event) => setIncludeInactiveUsers(event.target.checked)}
                      />
                    }
                    label="Include inactive users"
                  />

                  <Autocomplete
                    options={assignableUsers}
                    value={selectedUser}
                    onChange={(_, value) => {
                      setSelectedUser(value);
                      setSaveMessage(null);
                      setErrorMessage(null);
                    }}
                    getOptionLabel={(option) =>
                      `${getUserDisplayName(option)} (${option.email})`
                    }
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select user"
                        helperText={
                          selectedClub
                            ? 'Only users not already assigned to this club are shown.'
                            : 'Select a club first.'
                        }
                      />
                    )}
                    disabled={!selectedClub}
                  />

                  {selectedUser && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.default',
                      }}
                    >
                      <Stack spacing={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {getUserDisplayName(selectedUser)}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          {selectedUser.email}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            size="small"
                            label={selectedUser.isActive ? 'Active' : 'Inactive'}
                            color={selectedUser.isActive ? 'success' : 'default'}
                          />
                          <Chip
                            size="small"
                            label={`Role: ${selectedUser.role ?? 'User'}`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Experience: ${selectedUser.experienceLevel ?? '-'}`}
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={() => void handleAssign()}
                      disabled={
                        !selectedClub ||
                        !selectedUser ||
                        createMutation.isPending ||
                        removeMutation.isPending
                      }
                    >
                      {createMutation.isPending ? 'Assigning...' : 'Assign operator'}
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefresh}
                      disabled={createMutation.isPending || removeMutation.isPending}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Current Operators
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedClub
                          ? `Operators assigned to ${getClubDisplayName(selectedClub)}`
                          : 'Select a club to view operator assignments.'}
                      </Typography>
                    </Box>

                    {selectedClub && (
                      <Chip label={`Club ID: ${selectedClub.id}`} variant="outlined" />
                    )}
                  </Box>

                  <Divider />

                  {!selectedClub ? (
                    <Alert severity="info">
                      Select a club on the left to view and manage its operators.
                    </Alert>
                  ) : operatorsQuery.isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : operators.length === 0 ? (
                    <Alert severity="warning">
                      This club currently has no operators assigned.
                    </Alert>
                  ) : (
                    <List disablePadding>
                      {operators.map((operator, index) => {
                        const operatorUser = operatorUsersById.get(operator.userId);

                        return (
                          <Box key={operator.id}>
                            <ListItem
                              disableGutters
                              secondaryAction={
                                <Button
                                  color="error"
                                  startIcon={<DeleteOutlineIcon />}
                                  onClick={() => void handleRemove(operator)}
                                  disabled={removeMutation.isPending}
                                >
                                  Remove
                                </Button>
                              }
                              sx={{ py: 1.5 }}
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
                                      {operatorUser
                                        ? getUserDisplayName(operatorUser)
                                        : `User #${operator.userId}`}
                                    </Typography>

                                    <Chip
                                      size="small"
                                      label={`User ID: ${operator.userId}`}
                                      variant="outlined"
                                    />

                                    {operatorUser && (
                                      <Chip
                                        size="small"
                                        label={operatorUser.isActive ? 'Active' : 'Inactive'}
                                        color={operatorUser.isActive ? 'success' : 'default'}
                                      />
                                    )}
                                  </Stack>
                                }
                                secondary={
                                  <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      {operatorUser?.email ?? 'Email not available'}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary">
                                      Assigned:{' '}
                                      {new Date(operator.createdUtc).toLocaleString()}
                                    </Typography>
                                  </Stack>
                                }
                              />
                            </ListItem>

                            {index < operators.length - 1 && <Divider />}
                          </Box>
                        );
                      })}
                    </List>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
      </Stack>
    </Box>
  );
}