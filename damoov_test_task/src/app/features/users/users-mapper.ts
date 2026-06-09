import { APPLICATION_ID } from '../../core/config';
import { FilteredUsersResult, GetUsersRequest, UsersPage, UsersQuery } from './user.model';

/**
 * Builds the exact GetFilteredPage request body. `ApplicationIds` is mandatory —
 * the endpoint returns nothing useful without it. `CompanyIds`/`InstanceIds` are
 * intentionally omitted; they are not needed for this scope.
 */
export function buildGetFilteredPageBody(query: UsersQuery): GetUsersRequest {
  const searchTerm = query.searchTerm?.trim();
  return {
    ApplicationIds: [APPLICATION_ID],
    PageNumber: query.pageNumber,
    PageSize: query.pageSize,
    IncludeAccountInfo: true,
    ...(searchTerm ? { SearchTerm: searchTerm } : {}),
  };
}

/** Maps the API's paged container into the view-model the page drives. */
export function normalizeUsersPage(
  result: FilteredUsersResult | null | undefined,
  query: UsersQuery,
): UsersPage {
  const users = result?.Users ?? [];
  return {
    users,
    totalUsers: result?.TotalUsers ?? users.length,
    totalPages: result?.TotalPages ?? 0,
    currentPage: result?.CurrentPage ?? query.pageNumber,
    hasPrevious: result?.HasPreviousPage ?? query.pageNumber > 1,
    hasNext: result?.HasNextPage ?? false,
  };
}
