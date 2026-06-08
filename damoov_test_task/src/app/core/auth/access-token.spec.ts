import { readAccessTokenFromUrl } from './access-token';

describe('readAccessTokenFromUrl', () => {
  it('prefers the hash fragment over the query string', () => {
    const token = readAccessTokenFromUrl({
      search: '?access_token=from-query',
      hash: '#access_token=from-hash',
    });
    expect(token).toBe('from-hash');
  });

  it('falls back to the query string when the hash has no token', () => {
    expect(readAccessTokenFromUrl({ search: '?access_token=from-query', hash: '' })).toBe(
      'from-query',
    );
  });

  it('accepts the "token" alias', () => {
    expect(readAccessTokenFromUrl({ search: '?token=aliased', hash: '' })).toBe('aliased');
  });

  it('trims surrounding whitespace', () => {
    expect(readAccessTokenFromUrl({ search: '?access_token=%20padded%20', hash: '' })).toBe(
      'padded',
    );
  });

  it('returns null when no token is present', () => {
    expect(readAccessTokenFromUrl({ search: '?foo=bar', hash: '' })).toBeNull();
  });
});
