import Alert from '@mui/material/Alert';

type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return <Alert severity="info">{message}</Alert>;
}