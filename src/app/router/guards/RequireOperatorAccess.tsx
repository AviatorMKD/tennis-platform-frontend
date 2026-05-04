import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import { getMyOperatorClubCards } from '../../../api/operatorDashboard.api';

type Props = {
    children: ReactNode;
};

export function RequireOperatorAccess({ children }: Props) {
    const { user, isAuthenticated } = useAuth();

    const isSystemAdmin = user?.role === 'SystemAdmin';
    const userId = user?.id;

    const query = useQuery({
        queryKey: ['operator-access-check', userId, isSystemAdmin],
        queryFn: () => getMyOperatorClubCards(userId!, isSystemAdmin),
        enabled: isAuthenticated && !!userId,
        staleTime: 60_000,
    });

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (isSystemAdmin) {
        return <>{children}</>;
    }

    if (query.isLoading) {
        return null;
    }

    const hasAccess = (query.data?.length ?? 0) > 0;

    if (!hasAccess) {
        return <Navigate to="/app/bookings" replace />;
    }

    return <>{children}</>;
}