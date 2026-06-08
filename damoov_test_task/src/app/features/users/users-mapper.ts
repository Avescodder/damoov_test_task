import { FilteredUsersResult, ManagedUser, UserRow, UsersPage, UsersQuery } from './user.model';

const EMPTY = '—';

export function buildGetFilteredPageBody(query: UsersQuery): Record<string, unknown> {
  return {
    CompanyIds: query.companyIds,
    PageNumber: query.pageNumber,
    PageSize: query.pageSize,
    IncludeAccountInfo: true,
    ShowInactiveUsers: query.showInactiveUsers ?? true,
    SearchTerm: query.searchTerm?.trim() || undefined,
    Sort: query.sort,
  };
}

export function normalizeUsersPage(
  result: FilteredUsersResult | null | undefined,
  query: UsersQuery,
): UsersPage {
  const users = result?.Users ?? result?.Items ?? result?.Data ?? [];
  const rows = users.map(toUserRow);
  return {
    rows,
    total: result?.TotalItems ?? result?.Total ?? result?.TotalCount ?? rows.length,
    pageNumber: result?.PageNumber ?? result?.Page ?? query.pageNumber,
    pageSize: result?.PageSize ?? query.pageSize,
  };
}

export function toUserRow(user: ManagedUser): UserRow {
  return {
    id: text(pick(user, 'Id', 'UserId', 'DeviceToken')),
    name: fullName(user),
    email: text(user.Email),
    phone: text(user.Phone),
    status: text(pick(user, 'ActivityStatus', 'Status')),
    location: joinTruthy([user.City, user.Country], ', '),
    createdAt: formatDate(pick(user, 'DateCreated', 'CreatedAt')),
    raw: user,
  };
}

export function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return EMPTY;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : date.toISOString().slice(0, 10);
}

function fullName(user: ManagedUser): string {
  const composed = joinTruthy([user.FirstName, user.LastName], ' ');
  return composed !== EMPTY ? composed : text(pick(user, 'Nickname', 'DeviceToken'));
}

function joinTruthy(parts: Array<string | undefined>, separator: string): string {
  const joined = parts.filter(Boolean).join(separator).trim();
  return joined || EMPTY;
}

function pick(source: ManagedUser, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function text(value: unknown): string {
  return value === undefined || value === null || value === '' ? EMPTY : String(value);
}
