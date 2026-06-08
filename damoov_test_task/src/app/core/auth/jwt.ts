export type JwtClaims = Record<string, unknown>;

/** Decodes a JWT payload without verifying it — enough to read claims the host
 * already trusts (the token is validated server-side on every API call). */
export function decodeJwt(token: string): JwtClaims | null {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }
  try {
    return JSON.parse(base64UrlDecode(segments[1]));
  } catch {
    return null;
  }
}

const COMPANY_CLAIMS = [
  'CompanyIds',
  'companyIds',
  'company_ids',
  'CompanyId',
  'companyId',
  'company_id',
  'companyid',
];

/** Pulls the company scope out of the token claims, tolerant to claim naming. */
export function extractCompanyIds(claims: JwtClaims): string[] {
  for (const claim of COMPANY_CLAIMS) {
    const ids = toStringArray(claims[claim]);
    if (ids.length) {
      return ids;
    }
  }
  for (const [key, value] of Object.entries(claims)) {
    if (/company/i.test(key)) {
      const ids = toStringArray(value);
      if (ids.length) {
        return ids;
      }
    }
  }
  return [];
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return [];
}
