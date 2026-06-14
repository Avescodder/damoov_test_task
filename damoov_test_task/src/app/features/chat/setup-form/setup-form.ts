import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { APPLICATION_ID } from '../../../core/config';

export interface SetupDetails {
  token: string;
  applicationId: string;
}

@Component({
  selector: 'app-setup-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setup-form.html',
})
export class SetupForm {
  readonly start = output<SetupDetails>();

  readonly token = signal('');
  readonly applicationId = signal(APPLICATION_ID);
  readonly valid = computed(() => !!this.token().trim() && !!this.applicationId().trim());

  submit(): void {
    if (!this.valid()) {
      return;
    }
    this.start.emit({ token: this.token().trim(), applicationId: this.applicationId().trim() });
  }
}
