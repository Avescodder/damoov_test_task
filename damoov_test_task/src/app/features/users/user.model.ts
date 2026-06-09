/**
 * Types for the `Management/users/GetFilteredPage` endpoint. The shapes mirror
 * the API exactly: every `UserProfile` and `MobileDevice` field can be null, and
 * `UserFields` can be null as a whole.
 */

export interface UserProfile {
  FirstName: string | null;
  LastName: string | null;
  Email: string | null;
  Phone: string | null;
  ImageUrl: string | null;
}

export interface MobileDevice {
  DeviceModel: string | null;
  OsType: string;
  VirtualImei: string | null;
}

export interface AccountInfo {
  CompanyName: string;
  ApplicationName: string;
  InstanceName: string;
}

export interface UserField {
  ClientId: string;
  EnableTracking: boolean;
  Enabled: boolean;
}

/** A single user as returned by GetFilteredPage. Identity is the DeviceToken. */
export interface User {
  DeviceToken: string;
  DateCreated: string;
  Status: 'Active' | 'Inactive';
  ActivityStatus: string;
  UserProfile: UserProfile;
  MobileDevice: MobileDevice;
  AccountInfo: AccountInfo;
  UserFields: UserField[] | null;
}

/** Paged container returned inside the API envelope's `Result`. */
export interface FilteredUsersResult {
  Users: User[];
  HasPreviousPage: boolean;
  HasNextPage: boolean;
  TotalUsers: number;
  TotalPages: number;
  CurrentPage: number;
}

/** Request body for GetFilteredPage. */
export interface GetUsersRequest {
  ApplicationIds: string[];
  PageNumber: number;
  PageSize: number;
  IncludeAccountInfo: boolean;
  SearchTerm?: string;
}

/** What the page component drives the table and pagination with. */
export interface UsersQuery {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
}

/** Normalized page: the user rows plus the pagination state. */
export interface UsersPage {
  users: User[];
  totalUsers: number;
  totalPages: number;
  currentPage: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
