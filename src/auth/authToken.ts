export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    );

    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getJwtExpiryEpochSeconds(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  return typeof exp === 'number' ? exp : null;
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const exp = getJwtExpiryEpochSeconds(token);
  if (!exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return exp <= now + skewSeconds;
}