import { APPLICATION_ID } from '../../core/config';
import { FilteredUsersResult, UsersQuery } from './user.model';
import { buildGetFilteredPageBody, normalizeUsersPage } from './users-mapper';

const query: UsersQuery = { pageNumber: 2, pageSize: 20 };

describe('buildGetFilteredPageBody', () => {
  it('builds the exact GetFilteredPage body with the application id', () => {
    const body = buildGetFilteredPageBody({ pageNumber: 1, pageSize: 20 });
    expect(body).toEqual({
      ApplicationIds: [APPLICATION_ID],
      PageNumber: 1,
      PageSize: 20,
      IncludeAccountInfo: true,
    });
  });

  it('does not send CompanyIds or InstanceIds', () => {
    const body = buildGetFilteredPageBody({ pageNumber: 3, pageSize: 50 });
    expect(body).not.toHaveProperty('CompanyIds');
    expect(body).not.toHaveProperty('InstanceIds');
  });

  it('includes a trimmed search term and omits an empty one', () => {
    expect(
      buildGetFilteredPageBody({ pageNumber: 1, pageSize: 10, searchTerm: '  ann  ' }),
    ).toMatchObject({ SearchTerm: 'ann' });
    expect(
      buildGetFilteredPageBody({ pageNumber: 1, pageSize: 10, searchTerm: '   ' }),
    ).not.toHaveProperty('SearchTerm');
  });
});

describe('normalizeUsersPage', () => {
  it('maps the paged container from the API field names', () => {
    const result = {
      Users: [{ DeviceToken: 'd1' }],
      TotalUsers: 100,
      TotalPages: 5,
      CurrentPage: 2,
      HasPreviousPage: true,
      HasNextPage: true,
    } as unknown as FilteredUsersResult;

    const page = normalizeUsersPage(result, query);
    expect(page.users).toHaveLength(1);
    expect(page.totalUsers).toBe(100);
    expect(page.totalPages).toBe(5);
    expect(page.currentPage).toBe(2);
    expect(page.hasPrevious).toBe(true);
    expect(page.hasNext).toBe(true);
  });

  it('falls back to the requested page when the server omits paging info', () => {
    const page = normalizeUsersPage({ Users: [] } as unknown as FilteredUsersResult, query);
    expect(page.currentPage).toBe(query.pageNumber);
    expect(page.totalUsers).toBe(0);
    expect(page.hasNext).toBe(false);
    expect(page.hasPrevious).toBe(true);
  });

  it('handles a missing result', () => {
    const page = normalizeUsersPage(null, query);
    expect(page.users).toEqual([]);
    expect(page.totalUsers).toBe(0);
  });
});
