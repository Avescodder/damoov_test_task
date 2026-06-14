import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChatStore } from '../chat-store';
import { ChatView } from '../chat-view/chat-view';
import { SetupDetails, SetupForm } from '../setup-form/setup-form';

@Component({
  selector: 'app-chat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SetupForm, ChatView],
  templateUrl: './chat-page.html',
})
export class ChatPage {
  private readonly store = inject(ChatStore);
  readonly started = this.store.started;

  begin(details: SetupDetails): void {
    this.store.start(details.token, details.applicationId);
  }
}
