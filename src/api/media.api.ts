import { apiClient } from './client';

export type MediaFileDto = {
  id: number;
  fileType: string;
  mediaType: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  url: string | null;
  usageType: string | null;
  sortOrder: number | null;
  isActive: boolean;
  createdUtc: string;
};

export type UploadMediaParams = {
  file: File;
  entityType: 'club' | 'court' | 'user';
  entityId: number;
  usageType: 'Hero' | 'Gallery' | 'Profile' | string;
  sortOrder: number;
};

export async function getClubMedia(clubId: number): Promise<MediaFileDto[]> {
  const response = await apiClient.get<MediaFileDto[]>(`/api/Media/club/${clubId}`);
  return response.data;
}

export async function uploadMedia(params: UploadMediaParams): Promise<MediaFileDto> {
  const formData = new FormData();

  formData.append('file', params.file);
  formData.append('entityType', params.entityType);
  formData.append('entityId', String(params.entityId));
  formData.append('usageType', params.usageType);
  formData.append('sortOrder', String(params.sortOrder));

  const response = await apiClient.post<MediaFileDto>('/api/Media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function deleteMedia(mediaFileId: number): Promise<void> {
  await apiClient.delete(`/api/Media/${mediaFileId}`);
}