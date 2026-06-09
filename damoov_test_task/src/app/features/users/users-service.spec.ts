import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiResponse } from '../../core/api-response';
import { API_BASE_URL } from '../../core/config';
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

  it('posts the filter body and returns a normalized page', () => {
    let result: UsersPage | undefined;
    service
      .getFilteredPage({ pageNumber: 1, pageSize: 25, searchTerm: ' ann ' })
      .subscribe((page) => (result = page));

    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      PageNumber: 1,
      PageSize: 25,
      SearchTerm: 'ann',
    });

    req.flush(
      envelope({
        Users: [{ DeviceToken: 'd1', UserProfile: { FirstName: 'Ann', LastName: 'Lee' } }],
        TotalUsers: 1,
        CurrentPage: 1,
        HasPreviousPage: true,
        HasNextPage: false,
      }),
    );

    expect(result?.totalUsers).toBe(1);
    expect(result?.rows[0].name).toBe('Ann Lee');
  });

  it('raises the API error message when the envelope reports a failure', () => {
    let error: Error | undefined;
    service
      .getFilteredPage({ pageNumber: 0, pageSize: 25 })
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
