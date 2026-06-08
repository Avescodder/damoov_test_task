import { resolveCompanyIds } from './company-context';

function makeJwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode(claims)}.signature`;
}

const NO_URL = { search: '', hash: '' };

describe('resolveCompanyIds', () => {
  it('reads a comma-separated list from the URL, hash first', () => {
    expect(resolveCompanyIds(null, { search: '', hash: '#company_ids=a,b' })).toEqual(['a', 'b']);
  });

  it('reads company_id from the query string', () => {
    expect(resolveCompanyIds(null, { search: '?company_id=a', hash: '' })).toEqual(['a']);
  });

  it('falls back to the token claims', () => {
    expect(resolveCompanyIds(makeJwt({ CompanyId: 'from-token' }), NO_URL)).toEqual(['from-token']);
  });

  it('prefers the URL over the token', () => {
    const token = makeJwt({ CompanyId: 'from-token' });
    expect(resolveCompanyIds(token, { search: '?company_ids=from-url', hash: '' })).toEqual([
      'from-url',
    ]);
  });

  it('returns empty when neither source has a company', () => {
    expect(resolveCompanyIds(makeJwt({ sub: '1' }), NO_URL)).toEqual([]);
    expect(resolveCompanyIds(null, NO_URL)).toEqual([]);
  });
});
