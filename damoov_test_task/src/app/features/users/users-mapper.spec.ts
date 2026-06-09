import { UsersQuery } from './user.model';
import {
  buildGetFilteredPageBody,
  formatDate,
  normalizeUsersPage,
  toUserRow,
} from './users-mapper';

const query: UsersQuery = { companyIds: ['co-1'], pageNumber: 2, pageSize: 25 };

describe('buildGetFilteredPageBody', () => {
  it('maps the query to the API contract and trims the search term', () => {
    const body = buildGetFilteredPageBody({
      companyIds: ['co-1', 'co-2'],
      pageNumber: 1,
      pageSize: 50,
      searchTerm: '  ann  ',
    });
    expect(body).toMatchObject({
      CompanyIds: ['co-1', 'co-2'],
      PageNumber: 1,
      PageSize: 50,
      IncludeAccountInfo: true,
      ShowInactiveUsers: true,
      SearchTerm: 'ann',
    });
  });

  it('omits an empty search term', () => {
    expect(
      buildGetFilteredPageBody({
        companyIds: ['co-1'],
        pageNumber: 0,
        pageSize: 25,
        searchTerm: '   ',
      })['SearchTerm'],
    ).toBeUndefined();
  });
});

describe('normalizeUsersPage', () => {
  it('maps the paged container from the API field names', () => {
    const page = normalizeUsersPage(
      {
        Users: [{ DeviceToken: 'd1' }],
        TotalUsers: 7,
        TotalPages: 1,
        CurrentPage: 2,
        HasPreviousPage: true,
        HasNextPage: false,
      },
      query,
    );
    expect(page.rows).toHaveLength(1);
    expect(page.totalUsers).toBe(7);
    expect(page.currentPage).toBe(2);
    expect(page.hasPrevious).toBe(true);
    expect(page.hasNext).toBe(false);
  });

  it('falls back to the requested page and row count when the server omits them', () => {
    const page = normalizeUsersPage({ Users: [{}, {}] }, query);
    expect(page.totalUsers).toBe(2);
    expect(page.currentPage).toBe(query.pageNumber);
    expect(page.pageSize).toBe(query.pageSize);
    expect(page.hasNext).toBe(false);
  });

  it('handles an empty result', () => {
    const page = normalizeUsersPage(null, query);
    expect(page.rows).toEqual([]);
    expect(page.totalUsers).toBe(0);
  });
});

describe('toUserRow', () => {
  it('reads display fields from UserProfile and identity from DeviceToken', () => {
    const row = toUserRow({
      DeviceToken: 'd1',
      Status: 'Active',
      DateCreated: '2026-06-08T20:37:47.076Z',
      UserProfile: {
        FirstName: 'Ann',
        LastName: 'Lee',
        Email: 'ann@b.c',
        City: 'Berlin',
        Country: 'DE',
      },
    });
    expect(row).toMatchObject({
      id: 'd1',
      name: 'Ann Lee',
      email: 'ann@b.c',
      status: 'Active',
      location: 'Berlin, DE',
      createdAt: '2026-06-08',
    });
  });

  it('falls back to nickname, then device token, for the name', () => {
    expect(toUserRow({ UserProfile: { Nickname: 'annie' } }).name).toBe('annie');
    expect(toUserRow({ DeviceToken: 'device-1' }).name).toBe('device-1');
  });

  it('renders a dash for missing fields', () => {
    const row = toUserRow({});
    expect(row.email).toBe('—');
    expect(row.location).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an ISO timestamp as a calendar date', () => {
    expect(formatDate('2026-06-08T20:37:47.076Z')).toBe('2026-06-08');
  });

  it('returns a dash for empty or invalid input', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});
