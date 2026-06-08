import { TestBed } from '@angular/core/testing';
import { UserRow } from '../user.model';
import { UsersTable } from './users-table';

function row(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: '1',
    name: 'Ann Lee',
    email: 'ann@example.com',
    phone: '—',
    status: 'Active',
    location: 'Berlin, DE',
    createdAt: '2026-06-08',
    raw: {},
    ...overrides,
  };
}

describe('UsersTable', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [UsersTable] }));

  it('renders one row per user', async () => {
    const fixture = TestBed.createComponent(UsersTable);
    fixture.componentRef.setInput('rows', [row({ id: '1' }), row({ id: '2', name: 'Bob' })]);
    await fixture.whenStable();

    const tableRows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(tableRows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Bob');
  });

  it('marks active users with the success style', () => {
    const component = TestBed.createComponent(UsersTable).componentInstance;
    expect(component.statusClass('Active')).toContain('emerald');
    expect(component.statusClass('Inactive')).toContain('rose');
    expect(component.statusClass('Pending')).toContain('slate');
  });
});
