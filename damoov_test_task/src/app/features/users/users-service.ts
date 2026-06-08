import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiResponse, firstErrorMessage, isSuccessful } from '../../core/api-response';
import { API_BASE_URL, API_V1 } from '../../core/config';
import { FilteredUsersResult, UsersPage, UsersQuery } from './user.model';
import { buildGetFilteredPageBody, normalizeUsersPage } from './users-mapper';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(API_BASE_URL) + API_V1 + '/Management/users/GetFilteredPage';

  getFilteredPage(query: UsersQuery): Observable<UsersPage> {
    return this.http
      .post<ApiResponse<FilteredUsersResult>>(this.endpoint, buildGetFilteredPageBody(query))
      .pipe(
        map((response) => {
          if (!isSuccessful(response)) {
            throw new Error(firstErrorMessage(response) ?? 'The server rejected the request.');
          }
          return normalizeUsersPage(response.Result, query);
        }),
      );
  }
}
