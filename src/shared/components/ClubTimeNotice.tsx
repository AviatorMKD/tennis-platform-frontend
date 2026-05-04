import CloseIcon from '@mui/icons-material/Close';
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import { useState } from 'react';

const STORAGE_KEY = 'club-time-notice-dismissed';

function getInitialShowNotice() {
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}

export function ClubTimeNotice() {
  const [showNotice, setShowNotice] = useState(getInitialShowNotice);

  const handleClose = () => {
    setShowNotice(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!showNotice) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 2.5 } }}>
      <Alert
        severity="info"
        sx={{ mb: 0, borderRadius: 2 }}
        action={
          <IconButton
            type="button"
            size="small"
            onClick={handleClose}
            aria-label="Dismiss club time notice"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        All booking times are shown in the club’s local time zone: Europe/Skopje.
      </Alert>
    </Container>
  );
}