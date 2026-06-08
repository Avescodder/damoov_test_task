import { computed, Injectable, signal } from '@angular/core';

interface UrlParts {
  search: string;
  hash: string;
}

const TOKEN_PARAM_NAMES = ['access_token', 'token'] as const;

/**
 * Reads the JWT the host page hands us through the iframe URL. The hash fragment
 * is preferred over the query string because it is never sent to the server and
 * stays out of access logs and the Referer header.
 */
export function readAccessTokenFromUrl(location: UrlParts = window.location): string | null {
  return readFromParams(stripLeading(location.hash, '#')) ?? readFromParams(location.search);
}

function readFromParams(raw: string): string | null {
  if (!raw) {
    return null;
  }
  const params = new URLSearchParams(stripLeading(raw, '?'));
  for (const name of TOKEN_PARAM_NAMES) {
    const value = params.get(name)?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function stripLeading(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
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
