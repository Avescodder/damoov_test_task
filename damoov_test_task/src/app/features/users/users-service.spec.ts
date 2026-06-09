import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiResponse } from '../../core/api-response';
import { API_BASE_URL, APPLICATION_ID } from '../../core/config';
import { FilteredUsersResult, UsersPage } from './user.model';
import { UsersService } from './users-service';

const ENDPOINT = 'https://api.test/v1/Management/users/GetFilteredPage';

function envelope(
  result: FilteredUsersResult | null,
  overrides: Partial<ApiResponse<unknown>> = {},
) {
  return { Result: result, Status: 200, Title: '', Errors: [], ...overrides };
}

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.test' },
      ],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the exact filter body and returns a normalized page', () => {
    let result: UsersPage | undefined;
    service.getFilteredPage({ pageNumber: 1, pageSize: 20 }).subscribe((page) => (result = page));

    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ApplicationIds: [APPLICATION_ID],
      PageNumber: 1,
      PageSize: 20,
      IncludeAccountInfo: true,
    });

    req.flush(
      envelope({
        Users: [{ DeviceToken: 'd1' }],
        TotalUsers: 100,
        TotalPages: 5,
        CurrentPage: 1,
        HasPreviousPage: false,
        HasNextPage: true,
      } as unknown as FilteredUsersResult),
    );

    expect(result?.totalUsers).toBe(100);
    expect(result?.users[0].DeviceToken).toBe('d1');
    expect(result?.hasNext).toBe(true);
  });

  it('raises the API error message when the envelope reports a failure', () => {
    let error: Error | undefined;
    service
      .getFilteredPage({ pageNumber: 1, pageSize: 20 })
      .subscribe({ error: (e: Error) => (error = e) });

    httpMock.expectOne(ENDPOINT).flush(
      envelope(null, {
        Status: 400,
        Title: 'Bad request',
        Errors: [{ Message: 'Invalid filter' }],
      }),
    );

    expect(error?.message).toBe('Invalid filter');
  });
});
