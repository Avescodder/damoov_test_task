import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config';
import { AccessTokenStore } from './access-token';
import { authInterceptor } from './auth-interceptor';

function setup(token: string | null, baseUrl = '') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: baseUrl },
      { provide: AccessTokenStore, useValue: { token: () => token } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('authInterceptor', () => {
  it('attaches a bearer header to API requests when a token is present', () => {
    const { http, httpMock } = setup('jwt-123');
    http.get('/v1/Management/users').subscribe();

    const req = httpMock.expectOne('/v1/Management/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush({});
    httpMock.verify();
  });

  it('leaves requests untouched when there is no token', () => {
    const { http, httpMock } = setup(null);
    http.get('/v1/Management/users').subscribe();

    const req = httpMock.expectOne('/v1/Management/users');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    httpMock.verify();
  });

  it('ignores requests outside the API prefix', () => {
    const { http, httpMock } = setup('jwt-123');
    http.get('/assets/config.json').subscribe();

    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    httpMock.verify();
  });
});
