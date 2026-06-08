/** A user item as returned by GetFilteredPage. Fields are optional because the
 * payload depends on the filter (e.g. IncludeAccountInfo); the index signature
 * keeps the mapper free to read alternative spellings without fighting types. */
export interface ManagedUser {
  Id?: string;
  UserId?: string;
  DeviceToken?: string;
  FirstName?: string;
  LastName?: string;
  Nickname?: string;
  Email?: string;
  Phone?: string;
  ActivityStatus?: string;
  Status?: string;
  DateCreated?: string;
  CreatedAt?: string;
  Country?: string;
  City?: string;
  CompanyId?: string;
  ApplicationId?: string;
  InstanceId?: string;
  RtdEnabled?: boolean;
  [key: string]: unknown;
}

/** Raw paged container. The array/total keys are normalized by the mapper. */
export interface FilteredUsersResult {
  Users?: ManagedUser[];
  Items?: ManagedUser[];
  Data?: ManagedUser[];
  TotalItems?: number;
  Total?: number;
  TotalCount?: number;
  PageNumber?: number;
  Page?: number;
  PageSize?: number;
}

export interface UsersQuery {
  companyIds: string[];
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  showInactiveUsers?: boolean;
  sort?: string;
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
  total: number;
  pageNumber: number;
  pageSize: number;
}
