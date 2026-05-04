import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';

type Props = {
    children: ReactNode;
};

export function RequireAdmin({ children }: Props) {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'SystemAdmin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}