import { computed, Injectable, signal } from '@angular/core';
import { readParam, UrlParts } from '../url';

const TOKEN_PARAM_NAMES = ['access_token', 'token'] as const;

/**
 * Reads the JWT the host page hands us through the iframe URL. The hash fragment
 * is preferred over the query string because it is never sent to the server and
 * stays out of access logs and the Referer header.
 */
export function readAccessTokenFromUrl(location: UrlParts = window.location): string | null {
  return readParam(location, TOKEN_PARAM_NAMES);
}

@Injectable({ providedIn: 'root' })
export class AccessTokenStore {
  private readonly accessToken = signal<string | null>(readAccessTokenFromUrl());

  readonly token = this.accessToken.asReadonly();
  readonly hasToken = computed(() => this.accessToken() !== null);

  set(token: string | null): void {
    this.accessToken.set(token);
  }
}
