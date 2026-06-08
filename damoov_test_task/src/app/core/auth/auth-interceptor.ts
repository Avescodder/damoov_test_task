import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL, API_V1 } from '../config';
import { AccessTokenStore } from './access-token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiPrefix = inject(API_BASE_URL) + API_V1;
  const token = inject(AccessTokenStore).token();

  if (!token || !req.url.startsWith(apiPrefix)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
