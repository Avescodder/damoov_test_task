import { InjectionToken } from '@angular/core';

/**
 * Origin the telematics API is served from. Empty by default so the app talks to
 * the same origin it is hosted on — locally that is the dev-server proxy
 * (see `proxy.conf.json`), in production it is whatever gateway fronts the SPA.
 * Override it with an absolute origin to call the API directly.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '',
});

export const API_V1 = '/v1';
