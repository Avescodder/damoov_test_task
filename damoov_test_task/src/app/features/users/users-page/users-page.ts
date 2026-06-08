import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap, tap } from 'rxjs';
import { AccessTokenStore } from '../../../core/auth/access-token';
import { CompanyContext } from '../../../core/auth/company-context';
import { describeRequestError } from '../../../core/request-error';
import { UsersPage as UsersPageData, UsersQuery } from '../user.model';
import { UsersService } from '../users-service';
import { UsersTable } from '../users-table/users-table';

const PAGE_SIZES = [10, 25, 50, 100] as const;

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UsersTable],
  templateUrl: './users-page.html',
  styleUrl: './users-page.css',
})
export class UsersPage {
  private readonly usersService = inject(UsersService);
  private readonly tokenStore = inject(AccessTokenStore);
  private readonly companyContext = inject(CompanyContext);

  private readonly searchInput = new Subject<string>();
  private readonly reload = new Subject<void>();

  readonly pageSizes = PAGE_SIZES;
  readonly hasToken = this.tokenStore.hasToken;
  readonly hasCompany = this.companyContext.hasCompany;

  readonly pageNumber = signal(0);
  readonly pageSize = signal<number>(PAGE_SIZES[1]);
  readonly searchTerm = signal('');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal<UsersPageData | null>(null);

  readonly totalPages = computed(() => {
    const page = this.page();
    return page && page.pageSize > 0 ? Math.ceil(page.total / page.pageSize) : 0;
  });

  readonly rangeLabel = computed(() => {
    const page = this.page();
    if (!page || page.total === 0) {
      return 'No users';
    }
    const from = page.pageNumber * page.pageSize + 1;
    const to = Math.min(from + page.rows.length - 1, page.total);
    return `${from}–${to} of ${page.total}`;
  });

  readonly canGoPrevious = computed(() => this.pageNumber() > 0 && !this.loading());
  readonly canGoNext = computed(() => {
    const totalPages = this.totalPages();
    return !this.loading() && (totalPages === 0 || this.pageNumber() < totalPages - 1);
  });

  constructor() {
    this.searchInput
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.pageNumber.set(0);
        this.reload.next();
      });

    this.reload
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.usersService.getFilteredPage(this.currentQuery()).pipe(
            catchError((error: unknown) => {
              this.error.set(describeRequestError(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        if (page) {
          this.page.set(page);
        }
        this.loading.set(false);
      });

    if (this.hasToken() && this.hasCompany()) {
      this.reload.next();
    }
  }

  onSearch(term: string): void {
    this.searchInput.next(term);
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(0);
    this.reload.next();
  }

  previousPage(): void {
    if (this.canGoPrevious()) {
      this.pageNumber.update((value) => value - 1);
      this.reload.next();
    }
  }

  nextPage(): void {
    if (this.canGoNext()) {
      this.pageNumber.update((value) => value + 1);
      this.reload.next();
    }
  }

  retry(): void {
    this.reload.next();
  }

  private currentQuery(): UsersQuery {
    return {
      companyIds: this.companyContext.companyIds(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      searchTerm: this.searchTerm(),
    };
  }
}
