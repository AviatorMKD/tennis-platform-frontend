import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export function LoadingScreen() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}