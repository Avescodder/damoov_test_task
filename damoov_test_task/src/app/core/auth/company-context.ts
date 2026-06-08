import { computed, inject, Injectable } from '@angular/core';
import { readParam, UrlParts } from '../url';
import { AccessTokenStore } from './access-token';
import { decodeJwt, extractCompanyIds } from './jwt';

const COMPANY_PARAM_NAMES = ['company_ids', 'company_id', 'companyIds', 'companyId'] as const;

/**
 * GetFilteredPage requires a non-empty CompanyIds. We take it from the URL when
 * the host supplies it explicitly, otherwise from the token's own claims so the
 * widget works with nothing but an access token in the URL.
 */
export function resolveCompanyIds(token: string | null, location: UrlParts): string[] {
  const fromUrl = readParam(location, COMPANY_PARAM_NAMES);
  if (fromUrl) {
    return fromUrl
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  const claims = token ? decodeJwt(token) : null;
  return claims ? extractCompanyIds(claims) : [];
}

@Injectable({ providedIn: 'root' })
export class CompanyContext {
  private readonly tokenStore = inject(AccessTokenStore);

  readonly companyIds = computed(() => resolveCompanyIds(this.tokenStore.token(), window.location));
  readonly hasCompany = computed(() => this.companyIds().length > 0);
}
