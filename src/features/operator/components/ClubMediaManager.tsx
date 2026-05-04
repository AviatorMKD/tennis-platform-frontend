import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import UploadIcon from '@mui/icons-material/Upload';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    deleteMedia,
    getClubMedia,
    uploadMedia,
    type MediaFileDto,
} from '../../../api/media.api';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

type ClubMediaManagerProps = {
    clubId: number;
};

function getNextGallerySortOrder(items: MediaFileDto[]) {
  const galleryItems = items.filter(
    (item) => item.usageType?.toLowerCase() === 'gallery'
  );

  if (galleryItems.length === 0) {
    return 1;
  }

  return Math.max(...galleryItems.map((item) => item.sortOrder ?? 0)) + 1;
}

export function ClubMediaManager({ clubId }: ClubMediaManagerProps) {
    const queryClient = useQueryClient();

    const mediaQuery = useQuery({
        queryKey: ['club-media', clubId],
        queryFn: () => getClubMedia(clubId),
        enabled: Number.isFinite(clubId) && clubId > 0,
    });

    const uploadMutation = useMutation({
        mutationFn: uploadMedia,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['club-media', clubId] });
            await queryClient.invalidateQueries({ queryKey: ['club-booking-discovery', clubId] });
            await queryClient.invalidateQueries({ queryKey: ['operator-club', clubId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMedia,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['club-media', clubId] });
            await queryClient.invalidateQueries({ queryKey: ['club-booking-discovery', clubId] });
            await queryClient.invalidateQueries({ queryKey: ['operator-club', clubId] });
        },
    });

    const media = mediaQuery.data ?? [];
    const heroItems = media
  .filter((item) => item.usageType?.toLowerCase() === 'hero')
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const galleryItems = media
  .filter((item) => item.usageType?.toLowerCase() === 'gallery')
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const handleHeroUpload = async (file: File | undefined) => {
        if (!file) return;

        await uploadMutation.mutateAsync({
            file,
            entityType: 'club',
            entityId: clubId,
            usageType: 'Hero',
            sortOrder: 0,
        });
    };

    const handleGalleryUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const startSortOrder = getNextGallerySortOrder(media);

        for (let index = 0; index < files.length; index += 1) {
            await uploadMutation.mutateAsync({
                file: files[index],
                entityType: 'club',
                entityId: clubId,
                usageType: 'Gallery',
                sortOrder: startSortOrder + index,
            });
        }
    };

    const activeError =
        mediaQuery.error || uploadMutation.error || deleteMutation.error
            ? extractApiErrorMessage(
                mediaQuery.error || uploadMutation.error || deleteMutation.error,
                'Media operation failed.'
            )
            : '';

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 4,
                p: { xs: 2.25, md: 3 },
            }}
        >
            <Stack spacing={2.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <ImageOutlinedIcon color="primary" />
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 850 }}>
                            Club media
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage the club hero image and gallery images used on public club pages.
                        </Typography>
                    </Box>
                </Stack>

                {activeError && <Alert severity="error">{activeError}</Alert>}

                {mediaQuery.isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {!mediaQuery.isLoading && (
                    <>
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                Hero image
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                Upload one main image for future club cards and hero backgrounds.
                            </Typography>

                            <Button
                                component="label"
                                variant="contained"
                                startIcon={<UploadIcon />}
                                disabled={uploadMutation.isPending || deleteMutation.isPending}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Upload hero image
                                <input
                                    hidden
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                                    onChange={(event) => {
                                        void handleHeroUpload(event.target.files?.[0]);
                                        event.target.value = '';
                                    }}
                                />
                            </Button>

                            {heroItems.length === 0 ? (
                                <Alert severity="info">No hero image uploaded yet.</Alert>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        overflowX: 'auto',
                                        pb: 1,
                                    }}
                                >
                                    {heroItems.map((item) => (
                                        <MediaPreviewCard
                                            key={item.id}
                                            item={item}
                                            onDelete={() => void deleteMutation.mutateAsync(item.id)}
                                            disabled={deleteMutation.isPending || uploadMutation.isPending}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Stack>

                        <Divider />

                        <Stack spacing={1.5}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                Gallery images
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                Add one or more images for the public club info gallery.
                            </Typography>

                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<UploadIcon />}
                                disabled={uploadMutation.isPending || deleteMutation.isPending}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Add gallery images
                                <input
                                    hidden
                                    multiple
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                                    onChange={(event) => {
                                        void handleGalleryUpload(event.target.files);
                                        event.target.value = '';
                                    }}
                                />
                            </Button>

                            {galleryItems.length === 0 ? (
                                <Alert severity="info">No gallery images uploaded yet.</Alert>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        overflowX: 'auto',
                                        pb: 1,
                                    }}
                                >
                                    {galleryItems.map((item) => (
                                        <MediaPreviewCard
                                            key={item.id}
                                            item={item}
                                            onDelete={() => void deleteMutation.mutateAsync(item.id)}
                                            disabled={deleteMutation.isPending || uploadMutation.isPending}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Stack>
                    </>
                )}
            </Stack>
        </Paper>
    );
}

function isVideoMedia(item: MediaFileDto) {
  return (
    item.fileType?.toLowerCase() === 'video' ||
    item.contentType?.toLowerCase().startsWith('video/') ||
    item.fileName?.toLowerCase().endsWith('.mp4') ||
    item.fileName?.toLowerCase().endsWith('.webm') ||
    item.fileName?.toLowerCase().endsWith('.mov')
  );
}

function MediaPreviewCard({
  item,
  onDelete,
  disabled,
}: {
  item: MediaFileDto;
  onDelete: () => void;
  disabled: boolean;
}) {
  const isVideo = isVideoMedia(item);

  return (
    <Box
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: 220,
        height: 140,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.100',
      }}
    >
      {item.url ? (
        isVideo ? (
          <Box
            component="video"
            src={item.url}
            muted
            loop
            playsInline
            preload="metadata"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              bgcolor: '#000',
            }}
          />
        ) : (
          <Box
            component="img"
            src={item.url}
            alt={item.fileName}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )
      ) : (
        <Box
          sx={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: 'text.secondary',
          }}
        >
          No preview
        </Box>
      )}

      {isVideo && (
        <Box
          sx={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            px: 1,
            py: 0.25,
            borderRadius: 999,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Video
        </Box>
      )}

      <IconButton
        size="small"
        onClick={onDelete}
        disabled={disabled}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'rgba(255,255,255,0.92)',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,1)',
          },
        }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}