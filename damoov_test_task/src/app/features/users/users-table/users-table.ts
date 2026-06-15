import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { User } from '../user.model';

const EMPTY = '—';

@Component({
  selector: 'app-users-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './users-table.html',
})
export class UsersTable {
  readonly users = input.required<User[]>();

  readonly empty = EMPTY;

  tokenShort(user: User): string {
    return user.DeviceToken ? user.DeviceToken.slice(0, 8) : EMPTY;
  }

  clientId(user: User): string {
    return user.UserFields?.[0]?.ClientId || EMPTY;
  }

  device(user: User): string {
    return user.MobileDevice?.DeviceModel || user.MobileDevice?.OsType || EMPTY;
  }

  imei(user: User): string {
    return user.MobileDevice?.VirtualImei || EMPTY;
  }

  application(user: User): string {
    return user.AccountInfo?.ApplicationName || EMPTY;
  }

  activity(user: User): string {
    return user.ActivityStatus || EMPTY;
  }

  isActive(user: User): boolean {
    return user.Status === 'Active';
  }
}
