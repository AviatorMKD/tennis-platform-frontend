import Container from '@mui/material/Container';
import type { ReactNode } from 'react';

type PageContainerProps = {
    children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {children}
        </Container>
    );
}