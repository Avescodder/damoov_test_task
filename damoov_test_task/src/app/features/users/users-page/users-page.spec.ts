import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AccessTokenStore } from '../../../core/auth/access-token';
import { User, UsersPage as UsersPageData } from '../user.model';
import { UsersService } from '../users-service';
import { UsersPage } from './users-page';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    DeviceToken: 'device-1',
    DateCreated: '2026-05-30T08:50:21.365958',
    Status: 'Active',
    ActivityStatus: 'No Data',
    UserProfile: { FirstName: null, LastName: null, Email: null, Phone: null, ImageUrl: null },
    MobileDevice: { DeviceModel: null, OsType: '', VirtualImei: '0462' },
    AccountInfo: { CompanyName: 'Damoov', ApplicationName: 'iOS SDK[UAT]', InstanceName: 'Common' },
    UserFields: [{ ClientId: 'Android Test Samsung', EnableTracking: true, Enabled: true }],
    ...overrides,
  };
}

const samplePage: UsersPageData = {
  users: [makeUser()],
  totalUsers: 1,
  totalPages: 1,
  currentPage: 1,
  hasPrevious: false,
  hasNext: false,
};

function createComponent(hasToken: boolean, response: Observable<UsersPageData>) {
  const service = { getFilteredPage: vi.fn(() => response) };
  TestBed.configureTestingModule({
    imports: [UsersPage],
    providers: [
      { provide: AccessTokenStore, useValue: { hasToken: () => hasToken, token: () => 'jwt' } },
      { provide: UsersService, useValue: service },
    ],
  });
  const fixture = TestBed.createComponent(UsersPage);
  fixture.detectChanges();
  return { fixture, service };
}

function text(fixture: ComponentFixture<UsersPage>): string {
  return fixture.nativeElement.textContent ?? '';
}

describe('UsersPage', () => {
  it('shows the access-token message and skips the request when no token is provided', () => {
    const { fixture, service } = createComponent(false, of(samplePage));
    expect(service.getFilteredPage).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('No access token');
    expect(text(fixture)).toContain('?access_token=<jwt>');
  });

  it('loads users and shows the total when a token is present', () => {
    const { fixture, service } = createComponent(true, of(samplePage));
    expect(service.getFilteredPage).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.users().length).toBe(1);
    expect(text(fixture)).toContain('Total: 1 users');
    expect(text(fixture)).toContain('Android Test Samsung');
  });

  it('renders the empty state when there are no users', () => {
    const { fixture } = createComponent(true, of({ ...samplePage, users: [], totalUsers: 0 }));
    expect(text(fixture)).toContain('No users found');
  });

  it('surfaces a friendly error and offers a retry', () => {
    const { fixture } = createComponent(
      true,
      throwError(() => new Error('Boom')),
    );
    expect(text(fixture)).toContain('Boom');
    expect(text(fixture)).toContain('Retry');
  });

  it('advances to the next page and refetches', () => {
    const { fixture, service } = createComponent(
      true,
      of({ ...samplePage, totalUsers: 100, totalPages: 5, currentPage: 1, hasNext: true }),
    );
    fixture.componentInstance.nextPage();
    expect(fixture.componentInstance.pageNumber()).toBe(1); // server echoes CurrentPage
    expect(service.getFilteredPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 2 }),
    );
  });

  it('resets to page 1 when the page size changes', () => {
    const { fixture, service } = createComponent(true, of(samplePage));
    fixture.componentInstance.changePageSize(50);
    expect(fixture.componentInstance.pageSize()).toBe(50);
    expect(service.getFilteredPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 1, pageSize: 50 }),
    );
  });
});
