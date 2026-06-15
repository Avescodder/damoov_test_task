import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ChatStore } from '../chat-store';
import { User } from '../../users/user.model';
import { UsersTable } from '../../users/users-table/users-table';

@Component({
  selector: 'app-users-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UsersTable],
  templateUrl: './users-panel.html',
})
export class UsersPanel {
  private readonly store = inject(ChatStore);

  readonly userSelect = output<User>();

  readonly users = this.store.panelUsers;
  readonly changed = this.store.changed;
  readonly flashing = this.store.flashing;
  readonly deleting = this.store.deleting;
}
