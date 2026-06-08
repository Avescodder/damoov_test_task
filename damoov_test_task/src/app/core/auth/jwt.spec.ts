import { decodeJwt, extractCompanyIds } from './jwt';

function makeJwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none' })}.${encode(claims)}.signature`;
}

describe('decodeJwt', () => {
  it('decodes the payload claims', () => {
    expect(decodeJwt(makeJwt({ sub: '42', CompanyId: 'c1' }))).toMatchObject({
      sub: '42',
      CompanyId: 'c1',
    });
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
  });
});

describe('extractCompanyIds', () => {
  it('reads a single company id claim', () => {
    expect(extractCompanyIds({ CompanyId: 'c1' })).toEqual(['c1']);
  });

  it('reads an array company ids claim', () => {
    expect(extractCompanyIds({ CompanyIds: ['c1', 'c2'] })).toEqual(['c1', 'c2']);
  });

  it('falls back to any company-like claim name', () => {
    expect(extractCompanyIds({ 'user/company_guid': 'c9' })).toEqual(['c9']);
  });

  it('returns empty when there is no company claim', () => {
    expect(extractCompanyIds({ sub: '42' })).toEqual([]);
  });
});
