import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getCourtById } from '../../../api/courts.api';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';

export function CourtDetailsPage() {
  const { courtId } = useParams();

  const parsedCourtId = Number(courtId);
  const isValidCourtId = Number.isInteger(parsedCourtId) && parsedCourtId > 0;

  const {
    data: court,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['court', parsedCourtId],
    queryFn: () => getCourtById(parsedCourtId),
    enabled: isValidCourtId,
  });

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h4">Court Details</Typography>

        <Button component={RouterLink} to="/clubs" variant="outlined">
          Back to Clubs
        </Button>
      </Stack>

      {!isValidCourtId && <ErrorState message="Invalid court ID." />}

      {isValidCourtId && isLoading && <LoadingScreen />}

      {isValidCourtId && isError && <ErrorState message="Failed to load court details." />}

      {isValidCourtId && !isLoading && !isError && !court && (
        <EmptyState message="Court not found." />
      )}

      {isValidCourtId && !isLoading && !isError && court && (
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="h5">{court.name}</Typography>

            <Chip
              label={court.isActive ? 'Active' : 'Inactive'}
              color={court.isActive ? 'success' : 'default'}
            />
          </Stack>

          <Typography>
            <strong>Court ID:</strong> {court.id}
          </Typography>

          <Typography>
            <strong>Club ID:</strong> {court.clubId}
          </Typography>

          <Typography>
            <strong>Surface:</strong> {court.surfaceType ?? 'Not specified'}
          </Typography>

          <Typography>
            <strong>Indoor:</strong> {court.isIndoor ? 'Yes' : 'No'}
          </Typography>

          {court.isIndoor && court.indoorCoverType && (
            <Typography>
              <strong>Indoor Cover Type:</strong> {court.indoorCoverType}
            </Typography>
          )}

          <Typography>
            <strong>Lighting:</strong> {court.hasLighting ? 'Yes' : 'No'}
          </Typography>

          <Typography>
            <strong>Heating:</strong> {court.hasHeating ? 'Yes' : 'No'}
          </Typography>

          <Typography>
            <strong>Cooling:</strong> {court.hasCooling ? 'Yes' : 'No'}
          </Typography>

          {court.conditionRating !== null && (
            <Typography>
              <strong>Condition Rating:</strong> {court.conditionRating}
            </Typography>
          )}

          <Typography>
            <strong>Sort Order:</strong> {court.sortOrder}
          </Typography>

          <Typography>
            <strong>Created UTC:</strong> {court.createdUtc}
          </Typography>

          <Box sx={{ pt: 2 }}>
            <Stack direction="row" spacing={2}>
              <Button
                component={RouterLink}
                to={`/clubs/${court.clubId}/courts`}
                variant="outlined"
              >
                Back to Club Courts
              </Button>

              <Button
                component={RouterLink}
                to={`/app/bookings/new?courtId=${court.id}`}
                variant="contained"
              >
                Book This Court
              </Button>
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
}