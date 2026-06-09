import { TestBed } from '@angular/core/testing';
import { User } from '../user.model';
import { UsersTable } from './users-table';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    DeviceToken: 'f925d077-c835-40c1-8e38-341726916fd2',
    DateCreated: '2026-05-30T08:50:21.365958',
    Status: 'Active',
    ActivityStatus: 'No Data',
    UserProfile: { FirstName: null, LastName: null, Email: null, Phone: null, ImageUrl: null },
    MobileDevice: { DeviceModel: null, OsType: '', VirtualImei: '046267130677462' },
    AccountInfo: { CompanyName: 'Damoov', ApplicationName: 'iOS SDK[UAT]', InstanceName: 'Common' },
    UserFields: [{ ClientId: 'Android Test Samsung', EnableTracking: true, Enabled: true }],
    ...overrides,
  };
}

describe('UsersTable', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [UsersTable] }));

  it('renders one row per user', async () => {
    const fixture = TestBed.createComponent(UsersTable);
    fixture.componentRef.setInput('users', [
      makeUser({ DeviceToken: 'aaaaaaaa-1' }),
      makeUser({ DeviceToken: 'bbbbbbbb-2' }),
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('shows the first 8 chars of the device token with the full value in title', () => {
    const component = TestBed.createComponent(UsersTable).componentInstance;
    const user = makeUser({ DeviceToken: 'f925d077-c835' });
    expect(component.tokenShort(user)).toBe('f925d077');
  });

  it('reads the client id from the first user field, dashes when absent', () => {
    const component = TestBed.createComponent(UsersTable).componentInstance;
    expect(component.clientId(makeUser())).toBe('Android Test Samsung');
    expect(component.clientId(makeUser({ UserFields: null }))).toBe('—');
    expect(component.clientId(makeUser({ UserFields: [] }))).toBe('—');
  });

  it('falls back through device model, os type, then a dash', () => {
    const component = TestBed.createComponent(UsersTable).componentInstance;
    expect(
      component.device(
        makeUser({ MobileDevice: { DeviceModel: 'iPhone 15', OsType: 'iOS', VirtualImei: null } }),
      ),
    ).toBe('iPhone 15');
    expect(
      component.device(
        makeUser({ MobileDevice: { DeviceModel: null, OsType: 'Android', VirtualImei: null } }),
      ),
    ).toBe('Android');
    expect(
      component.device(
        makeUser({ MobileDevice: { DeviceModel: null, OsType: '', VirtualImei: null } }),
      ),
    ).toBe('—');
  });

  it('flags active users', () => {
    const component = TestBed.createComponent(UsersTable).componentInstance;
    expect(component.isActive(makeUser({ Status: 'Active' }))).toBe(true);
    expect(component.isActive(makeUser({ Status: 'Inactive' }))).toBe(false);
  });
});
