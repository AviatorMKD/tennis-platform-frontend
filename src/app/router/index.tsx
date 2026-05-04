import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { AppLayout } from '../../layouts/AppLayout';
import { OperatorLayout } from '../../layouts/OperatorLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireAdmin } from './guards/RequireAdmin';
import { RequireOperatorAccess } from './guards/RequireOperatorAccess';

import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '../../features/auth/pages/VerifyEmailPage';

import { OperatorClubDetailsEditPage } from '../../features/operator/pages/OperatorClubDetailsEditPage';
import { CourtDetailsPage } from '../../features/courts/pages/CourtDetailsPage';

import { BookingCreatePage } from '../../features/bookings/pages/BookingCreatePage';
import { MyBookingsPage } from '../../features/bookings/pages/MyBookingsPage';
import { BookingDetailsPage } from '../../features/bookings/pages/BookingDetailsPage';

import { MyInvitationsPage } from '../../features/invitations/pages/MyInvitationsPage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage';

import { OperatorDashboardPage } from '../../features/operator/pages/OperatorDashboardPage';
import { OperatorClubCourtsPage } from '../../features/operator/pages/OperatorClubCourtsPage';
import { OperatorCourtManagementPage } from '../../features/operator/pages/OperatorCourtManagementPage';

import { AdminNotificationSettingsPage } from '../../features/admin/pages/AdminNotificationSettingsPage';
import { AdminClubOperatorsPage } from '../../features/admin/pages/AdminClubOperatorsPage';
import { AdminUsersPage } from '../../features/admin/pages/AdminUsersPage';

// ✅ NEW IMPORTS
import { HomePage } from '../../features/discovery/pages/HomePage';
import { ClubBookingPage } from '../../features/discovery/pages/ClubBookingPage';

import { OperatorClubSchedulePage } from '../../features/operator/pages/OperatorClubSchedulePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PublicLayout>
        <HomePage />
      </PublicLayout>
    ),
  },

  // ✅ NEW DISCOVERY ROUTE
  {
    path: '/discover/clubs/:clubId',
    element: (
      <PublicLayout>
        <ClubBookingPage />
      </PublicLayout>
    ),
  },

  {
    path: '/login',
    element: (
      <PublicLayout>
        <LoginPage />
      </PublicLayout>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicLayout>
        <RegisterPage />
      </PublicLayout>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <PublicLayout>
        <VerifyEmailPage />
      </PublicLayout>
    ),
  },
 

  {
    path: '/courts/:courtId',
    element: (
      <PublicLayout>
        <CourtDetailsPage />
      </PublicLayout>
    ),
  },

  {
    path: '/app/bookings/new',
    element: (
      <RequireAuth>
        <AppLayout>
          <BookingCreatePage />
        </AppLayout>
      </RequireAuth>
    ),
  },
  {
    path: '/app/bookings',
    element: (
      <RequireAuth>
        <AppLayout>
          <MyBookingsPage />
        </AppLayout>
      </RequireAuth>
    ),
  },
  {
    path: '/app/bookings/:bookingId',
    element: (
      <RequireAuth>
        <AppLayout>
          <BookingDetailsPage />
        </AppLayout>
      </RequireAuth>
    ),
  },

  {
    path: '/app/invitations',
    element: (
      <RequireAuth>
        <AppLayout>
          <MyInvitationsPage />
        </AppLayout>
      </RequireAuth>
    ),
  },

  {
    path: '/app/profile',
    element: (
      <RequireAuth>
        <AppLayout>
          <ProfilePage />
        </AppLayout>
      </RequireAuth>
    ),
  },

  {
    path: '/operator',
    element: (
      <RequireOperatorAccess>
        <OperatorLayout>
          <OperatorDashboardPage />
        </OperatorLayout>
      </RequireOperatorAccess>
    ),
  },

  {
  path: '/operator/clubs/:clubId/schedule',
  element: (
    <RequireOperatorAccess>
      <OperatorLayout>
        <OperatorClubSchedulePage />
      </OperatorLayout>
    </RequireOperatorAccess>
  ),
},

  {
  path: '/operator/clubs/:clubId/edit',
  element: (
    <RequireOperatorAccess>
      <OperatorLayout>
        <OperatorClubDetailsEditPage />
      </OperatorLayout>
    </RequireOperatorAccess>
  ),
},

  {
    path: '/operator/clubs/:clubId/courts',
    element: (
      <RequireOperatorAccess>
        <OperatorLayout>
          <OperatorClubCourtsPage />
        </OperatorLayout>
      </RequireOperatorAccess>
    ),
  },

  {
    path: '/operator/courts/:courtId/manage',
    element: (
      <RequireOperatorAccess>
        <OperatorLayout>
          <OperatorCourtManagementPage />
        </OperatorLayout>
      </RequireOperatorAccess>
    ),
  },

  {
    path: '/admin/users',
    element: (
      <RequireAdmin>
        <AppLayout>
          <AdminUsersPage />
        </AppLayout>
      </RequireAdmin>
    ),
  },
  {
    path: '/admin/club-operators',
    element: (
      <RequireAdmin>
        <AppLayout>
          <AdminClubOperatorsPage />
        </AppLayout>
      </RequireAdmin>
    ),
  },
  {
    path: '/admin/notification-settings',
    element: (
      <RequireAdmin>
        <AppLayout>
          <AdminNotificationSettingsPage />
        </AppLayout>
      </RequireAdmin>
    ),
  },
]);