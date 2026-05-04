import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import type { CourtDto } from '../../../api/courts.api';

type CourtCardProps = {
  court: CourtDto;
};

export function CourtCard({ court }: CourtCardProps) {
  const navigate = useNavigate();

  const handleOpenCourt = () => {
    void navigate(`/courts/${court.id}`);
  };

  return (
    <Card>
      <CardActionArea onClick={handleOpenCourt}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="h6">{court.name}</Typography>

              <Chip
                label={court.isActive ? 'Active' : 'Inactive'}
                color={court.isActive ? 'success' : 'default'}
                size="small"
              />
            </Stack>

            <Typography variant="body2">
              <strong>Surface:</strong> {court.surfaceType ?? 'Not specified'}
            </Typography>

            <Typography variant="body2">
              <strong>Indoor:</strong> {court.isIndoor ? 'Yes' : 'No'}
            </Typography>

            {court.isIndoor && court.indoorCoverType && (
              <Typography variant="body2">
                <strong>Cover Type:</strong> {court.indoorCoverType}
              </Typography>
            )}

            <Typography variant="body2">
              <strong>Lighting:</strong> {court.hasLighting ? 'Yes' : 'No'}
            </Typography>

            <Typography variant="body2">
              <strong>Heating:</strong> {court.hasHeating ? 'Yes' : 'No'}
            </Typography>

            <Typography variant="body2">
              <strong>Cooling:</strong> {court.hasCooling ? 'Yes' : 'No'}
            </Typography>

            {court.conditionRating !== null && (
              <Typography variant="body2">
                <strong>Condition Rating:</strong> {court.conditionRating}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}