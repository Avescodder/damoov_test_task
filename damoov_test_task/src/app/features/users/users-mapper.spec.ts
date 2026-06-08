import { UsersQuery } from './user.model';
import {
  buildGetFilteredPageBody,
  formatDate,
  normalizeUsersPage,
  toUserRow,
} from './users-mapper';

const query: UsersQuery = { pageNumber: 2, pageSize: 25 };

describe('buildGetFilteredPageBody', () => {
  it('maps the query to the API contract and trims the search term', () => {
    const body = buildGetFilteredPageBody({ pageNumber: 1, pageSize: 50, searchTerm: '  ann  ' });
    expect(body).toMatchObject({
      PageNumber: 1,
      PageSize: 50,
      IncludeAccountInfo: true,
      ShowInactiveUsers: true,
      SearchTerm: 'ann',
    });
  });

  it('omits an empty search term', () => {
    expect(
      buildGetFilteredPageBody({ pageNumber: 0, pageSize: 25, searchTerm: '   ' })['SearchTerm'],
    ).toBeUndefined();
  });
});

describe('normalizeUsersPage', () => {
  it('reads users and totals from the primary field names', () => {
    const page = normalizeUsersPage(
      { Users: [{ Email: 'a@b.c' }], TotalItems: 7, PageNumber: 2, PageSize: 25 },
      query,
    );
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(7);
    expect(page.pageNumber).toBe(2);
  });

  it('supports alternative container keys', () => {
    const page = normalizeUsersPage({ Items: [{ Email: 'x@y.z' }], Total: 1 }, query);
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it('falls back to the requested page and row count when the server omits them', () => {
    const page = normalizeUsersPage({ Data: [{}, {}] }, query);
    expect(page.total).toBe(2);
    expect(page.pageNumber).toBe(query.pageNumber);
    expect(page.pageSize).toBe(query.pageSize);
  });

  it('handles an empty result', () => {
    const page = normalizeUsersPage(null, query);
    expect(page.rows).toEqual([]);
    expect(page.total).toBe(0);
  });
});

describe('toUserRow', () => {
  it('composes the display name from first and last name', () => {
    expect(toUserRow({ FirstName: 'Ann', LastName: 'Lee' }).name).toBe('Ann Lee');
  });

  it('falls back to nickname, then device token, for the name and id', () => {
    expect(toUserRow({ Nickname: 'annie' }).name).toBe('annie');
    const row = toUserRow({ DeviceToken: 'device-1' });
    expect(row.name).toBe('device-1');
    expect(row.id).toBe('device-1');
  });

  it('combines city and country into a location', () => {
    expect(toUserRow({ City: 'Berlin', Country: 'DE' }).location).toBe('Berlin, DE');
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
