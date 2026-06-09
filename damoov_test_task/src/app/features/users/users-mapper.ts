import {
  FilteredUsersResult,
  ManagedUser,
  UserProfile,
  UserRow,
  UsersPage,
  UsersQuery,
} from './user.model';

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
  const rows = (result?.Users ?? []).map(toUserRow);
  return {
    rows,
    totalUsers: result?.TotalUsers ?? rows.length,
    currentPage: result?.CurrentPage ?? query.pageNumber,
    totalPages: result?.TotalPages ?? 0,
    pageSize: query.pageSize,
    hasPrevious: result?.HasPreviousPage ?? query.pageNumber > 0,
    hasNext: result?.HasNextPage ?? false,
  };
}

export function toUserRow(user: ManagedUser): UserRow {
  const profile = user.UserProfile ?? {};
  return {
    id: text(user.DeviceToken ?? user.IdentityId),
    name: displayName(user, profile),
    email: text(profile.Email),
    phone: text(profile.Phone),
    status: text(user.Status ?? user.ActivityStatus),
    location: joinTruthy([profile.City, profile.Country], ', '),
    createdAt: formatDate(user.DateCreated),
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

function displayName(user: ManagedUser, profile: UserProfile): string {
  const composed = joinTruthy([profile.FirstName, profile.LastName], ' ');
  return composed !== EMPTY ? composed : text(profile.Nickname ?? user.DeviceToken);
}

function joinTruthy(parts: Array<string | undefined>, separator: string): string {
  const joined = parts.filter(Boolean).join(separator).trim();
  return joined || EMPTY;
}

function text(value: unknown): string {
  return value === undefined || value === null || value === '' ? EMPTY : String(value);
}
