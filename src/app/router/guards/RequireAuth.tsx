import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { setPostLoginRedirectPath } from '../../../auth/authStorage';
import { useAuth } from '../../../auth/useAuth';

type RequireAuthProps = {
    children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        const redirectPath = `${location.pathname}${location.search}${location.hash}`;
        setPostLoginRedirectPath(redirectPath);

        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <>{children}</>;
}