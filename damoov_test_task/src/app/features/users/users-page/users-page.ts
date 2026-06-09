import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { AccessTokenStore } from '../../../core/auth/access-token';
import { describeRequestError } from '../../../core/request-error';
import { User } from '../user.model';
import { UsersService } from '../users-service';
import { UsersTable } from '../users-table/users-table';

const PAGE_SIZES = [10, 20, 50] as const;

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
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSizes = PAGE_SIZES;

  readonly token = this.tokenStore.token;
  readonly hasToken = this.tokenStore.hasToken;

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal<number>(20);
  readonly totalUsers = signal(0);
  readonly totalPages = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrev = signal(false);

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.users().length === 0);

  constructor() {
    if (this.hasToken()) {
      this.fetchUsers();
    }
  }

  fetchUsers(): void {
    if (!this.hasToken()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.usersService
      .getFilteredPage({ pageNumber: this.pageNumber(), pageSize: this.pageSize() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.users.set(page.users);
          this.totalUsers.set(page.totalUsers);
          this.totalPages.set(page.totalPages);
          this.hasNext.set(page.hasNext);
          this.hasPrev.set(page.hasPrevious);
          this.pageNumber.set(page.currentPage);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(describeRequestError(err));
          this.loading.set(false);
        },
      });
  }

  changePageSize(size: number): void {
    if (size === this.pageSize()) {
      return;
    }
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.fetchUsers();
  }

  nextPage(): void {
    if (this.hasNext() && !this.loading()) {
      this.pageNumber.update((n) => n + 1);
      this.fetchUsers();
    }
  }

  prevPage(): void {
    if (this.hasPrev() && !this.loading()) {
      this.pageNumber.update((n) => n - 1);
      this.fetchUsers();
    }
  }

  retry(): void {
    this.fetchUsers();
  }
}
