import { apiClient } from './client';

export type NotificationSettingsDto = {
  id: number;
  sendEmailVerification: boolean;
  sendPasswordReset: boolean;

  sendBookingCreatedToOwnerAndOperators: boolean;
  sendBookingConfirmedToOwnerAndOperators: boolean;
  sendBookingConfirmedToParticipants: boolean;

  sendBookingCancelledToOwnerAndOperators: boolean;
  sendBookingCancelledToParticipants: boolean;

  sendBookingAutoCancelledToOwnerAndOperators: boolean;
  sendBookingAutoCancelledToParticipants: boolean;

  sendBookingInvitationSent: boolean;

  createdUtc: string;
  updatedUtc: string;
};

export type UpdateNotificationSettingsRequest = {
  sendEmailVerification: boolean;
  sendPasswordReset: boolean;

  sendBookingCreatedToOwnerAndOperators: boolean;
  sendBookingConfirmedToOwnerAndOperators: boolean;
  sendBookingConfirmedToParticipants: boolean;

  sendBookingCancelledToOwnerAndOperators: boolean;
  sendBookingCancelledToParticipants: boolean;

  sendBookingAutoCancelledToOwnerAndOperators: boolean;
  sendBookingAutoCancelledToParticipants: boolean;

  sendBookingInvitationSent: boolean;
};

export async function getNotificationSettings(): Promise<NotificationSettingsDto> {
  const res = await apiClient.get<NotificationSettingsDto>(
    '/api/admin/notification-settings'
  );
  return res.data;
}

export async function updateNotificationSettings(
  payload: UpdateNotificationSettingsRequest
): Promise<NotificationSettingsDto> {
  const res = await apiClient.put<NotificationSettingsDto>(
    '/api/admin/notification-settings',
    payload
  );
  return res.data;
}