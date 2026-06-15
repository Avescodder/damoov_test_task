import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ChatStore } from '../chat-store';
import { UsersPanel } from '../users-panel/users-panel';

@Component({
  selector: 'app-chat-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UsersPanel],
  templateUrl: './chat-view.html',
})
export class ChatView {
  private readonly store = inject(ChatStore);
  private readonly scroll = viewChild<ElementRef<HTMLElement>>('scroll');

  readonly messages = this.store.messages;
  readonly activity = this.store.activity;
  readonly confirmation = this.store.confirmation;
  readonly busy = this.store.busy;
  readonly connected = this.store.connected;
  readonly draft = signal('');

  constructor() {
    effect(() => {
      this.messages();
      this.activity();
      const element = this.scroll()?.nativeElement;
      if (element) {
        queueMicrotask(() => (element.scrollTop = element.scrollHeight));
      }
    });
  }

  details(value: Record<string, unknown>): Array<[string, unknown]> {
    return Object.entries(value);
  }

  onEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey) {
      return;
    }
    event.preventDefault();
    this.send();
  }

  send(): void {
    this.store.send(this.draft());
    this.draft.set('');
  }

  respond(approved: boolean): void {
    this.store.respond(approved);
  }
}
