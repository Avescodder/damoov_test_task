import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AccessTokenStore } from '../../../core/auth/access-token';
import { CompanyContext } from '../../../core/auth/company-context';
import { UsersPage as UsersPageData } from '../user.model';
import { UsersService } from '../users-service';
import { UsersPage } from './users-page';

const samplePage: UsersPageData = {
  rows: [
    {
      id: 'device-1',
      name: 'Ann Lee',
      email: 'ann@example.com',
      phone: '—',
      status: 'Active',
      location: 'Berlin, DE',
      createdAt: '2026-06-08',
      raw: {},
    },
  ],
  totalUsers: 1,
  currentPage: 0,
  totalPages: 1,
  pageSize: 25,
  hasPrevious: false,
  hasNext: false,
};

function createComponent(
  hasToken: boolean,
  response: Observable<UsersPageData>,
  hasCompany = true,
) {
  const service = { getFilteredPage: vi.fn(() => response) };
  TestBed.configureTestingModule({
    imports: [UsersPage],
    providers: [
      { provide: AccessTokenStore, useValue: { hasToken: () => hasToken, token: () => 'jwt' } },
      {
        provide: CompanyContext,
        useValue: { hasCompany: () => hasCompany, companyIds: () => (hasCompany ? ['co-1'] : []) },
      },
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
  it('shows guidance and skips the request when no token is provided', () => {
    const { fixture, service } = createComponent(false, of(samplePage));
    expect(service.getFilteredPage).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('No access token');
  });

  it('asks for a company id when the token carries none', () => {
    const { fixture, service } = createComponent(true, of(samplePage), false);
    expect(service.getFilteredPage).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('No company selected');
  });

  it('loads and renders users when a token is present', () => {
    const { fixture, service } = createComponent(true, of(samplePage));
    expect(service.getFilteredPage).toHaveBeenCalledTimes(1);
    expect(text(fixture)).toContain('Ann Lee');
    expect(text(fixture)).toContain('1–1 of 1');
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
      of({ ...samplePage, totalUsers: 100, totalPages: 4, hasNext: true }),
    );
    fixture.componentInstance.nextPage();
    expect(fixture.componentInstance.pageNumber()).toBe(1);
    expect(service.getFilteredPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 1 }),
    );
  });
});
