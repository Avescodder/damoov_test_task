export interface UserProfile {
  FirstName?: string;
  LastName?: string;
  Nickname?: string;
  Email?: string;
  Phone?: string;
  Country?: string;
  District?: string;
  City?: string;
  Address?: string;
  ImageUrl?: string;
}

export interface AccountInfo {
  CompanyId?: string;
  CompanyName?: string;
  ApplicationId?: string;
  ApplicationName?: string;
  InstanceId?: string;
  InstanceName?: string;
}

/** A user item as returned by GetFilteredPage. Identity is the DeviceToken; the
 * display fields live under UserProfile and the scope under AccountInfo. */
export interface ManagedUser {
  DeviceToken?: string;
  IdentityId?: string;
  DateCreated?: string;
  Status?: string;
  ActivityStatus?: string;
  UserProfile?: UserProfile;
  AccountInfo?: AccountInfo;
}

/** Raw paged container returned inside the API envelope's Result. */
export interface FilteredUsersResult {
  Users?: ManagedUser[];
  TotalUsers?: number;
  TotalPages?: number;
  CurrentPage?: number;
  HasPreviousPage?: boolean;
  HasNextPage?: boolean;
}

export interface UsersQuery {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
}

/** Flattened, display-ready row. `raw` keeps the original item for drill-down. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  location: string;
  createdAt: string;
  raw: ManagedUser;
}

export interface UsersPage {
  rows: UserRow[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
