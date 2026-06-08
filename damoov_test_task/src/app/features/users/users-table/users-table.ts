import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UserRow } from '../user.model';

@Component({
  selector: 'app-users-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-table.html',
})
export class UsersTable {
  readonly rows = input.required<UserRow[]>();

  statusClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'active') {
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    }
    if (normalized === 'inactive' || normalized === 'deleted') {
      return 'bg-rose-50 text-rose-700 ring-rose-600/20';
    }
    return 'bg-slate-100 text-slate-600 ring-slate-500/20';
  }
}
