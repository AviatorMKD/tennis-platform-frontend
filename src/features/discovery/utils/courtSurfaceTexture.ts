import type { SxProps, Theme } from '@mui/material/styles';

type SurfaceType = string | null | undefined;

function getNormalizedSurface(surfaceType: SurfaceType) {
  return (surfaceType ?? '').trim().toLowerCase();
}

export function getCourtSurfaceTextureSx(surfaceType: SurfaceType): SxProps<Theme> {
  const surface = getNormalizedSurface(surfaceType);

  if (surface === 'clay') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#fff7f1',
      backgroundColor: '#b85a2b',
      backgroundImage: `
        radial-gradient(circle at 20% 18%, rgba(255,255,255,0.07) 0 2px, transparent 2px),
        radial-gradient(circle at 72% 64%, rgba(0,0,0,0.06) 0 1.5px, transparent 1.5px),
        radial-gradient(circle at 35% 78%, rgba(255,255,255,0.04) 0 1px, transparent 1px),
        linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 38%),
        linear-gradient(180deg, #c96b35 0%, #b85a2b 52%, #a94f24 100%)
      `,
      backgroundSize: '18px 18px, 22px 22px, 14px 14px, 100% 100%, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.18,
        backgroundImage: `
          repeating-linear-gradient(
            115deg,
            rgba(255,255,255,0.05) 0px,
            rgba(255,255,255,0.05) 1px,
            transparent 1px,
            transparent 7px
          )
        `,
        mixBlendMode: 'soft-light',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))',
      },
    };
  }

  if (surface === 'grass') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#f6fff3',
      backgroundColor: '#4f7f2b',
      backgroundImage: `
        repeating-linear-gradient(
          90deg,
          rgba(255,255,255,0.035) 0px,
          rgba(255,255,255,0.035) 2px,
          rgba(0,0,0,0.03) 2px,
          rgba(0,0,0,0.03) 4px,
          transparent 4px,
          transparent 12px
        ),
        radial-gradient(circle at 25% 30%, rgba(255,255,255,0.06) 0 1px, transparent 1px),
        radial-gradient(circle at 68% 58%, rgba(0,0,0,0.06) 0 1px, transparent 1px),
        linear-gradient(180deg, #6da83a 0%, #4f7f2b 55%, #3f6821 100%)
      `,
      backgroundSize: '100% 100%, 16px 16px, 18px 18px, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.2,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.06) 0px,
            rgba(255,255,255,0.06) 1px,
            transparent 1px,
            transparent 10px
          )
        `,
        mixBlendMode: 'soft-light',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.24))',
      },
    };
  }

  if (surface === 'hard') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#f4f8ff',
      backgroundColor: '#2f6aa3',
      backgroundImage: `
        radial-gradient(circle at 22% 22%, rgba(255,255,255,0.05) 0 1.5px, transparent 1.5px),
        radial-gradient(circle at 74% 62%, rgba(0,0,0,0.07) 0 1px, transparent 1px),
        repeating-linear-gradient(
          135deg,
          rgba(255,255,255,0.018) 0px,
          rgba(255,255,255,0.018) 2px,
          transparent 2px,
          transparent 8px
        ),
        linear-gradient(180deg, #4183c4 0%, #2f6aa3 58%, #245783 100%)
      `,
      backgroundSize: '18px 18px, 20px 20px, 100% 100%, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.18,
        backgroundImage: `
          repeating-radial-gradient(
            circle at 0 0,
            rgba(255,255,255,0.03) 0px,
            rgba(255,255,255,0.03) 1px,
            transparent 1px,
            transparent 6px
          )
        `,
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22))',
      },
    };
  }

  return {
    position: 'relative',
    overflow: 'hidden',
    color: 'text.primary',
    background:
      'linear-gradient(180deg, rgba(245,247,250,1) 0%, rgba(255,255,255,1) 100%)',
  };
}