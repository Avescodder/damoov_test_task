import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebSocketService } from '../../core/chat/websocket-service';
import { ConfirmationEvent, ServerEvent } from '../../core/chat/chat-protocol';
import { User } from '../users/user.model';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  users?: User[];
  streaming?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  list_users: 'Searching users',
  find_user: 'Looking up the user',
  count_users: 'Counting users',
  set_user_status: 'Updating status',
  set_sdk_settings: 'Updating SDK settings',
  delete_user: 'Deleting the user',
};

@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly ws = inject(WebSocketService);
  private readonly sessionId = crypto.randomUUID();

  readonly messages = signal<ChatMessage[]>([]);
  readonly activity = signal<string | null>(null);
  readonly confirmation = signal<ConfirmationEvent | null>(null);
  readonly busy = signal(false);
  readonly started = signal(false);
  readonly connected = computed(() => this.ws.status() === 'open');

  constructor() {
    this.ws.events.pipe(takeUntilDestroyed()).subscribe((event) => this.handle(event));
  }

  start(token: string, applicationId: string): void {
    this.started.set(true);
    this.ws.connect({ type: 'init', sessionId: this.sessionId, token, applicationId });
  }

  send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || this.busy()) {
      return;
    }
    this.push({ role: 'user', text: trimmed });
    this.busy.set(true);
    this.ws.send({ type: 'user_message', text: trimmed });
  }

  respond(approved: boolean): void {
    const pending = this.confirmation();
    if (!pending) {
      return;
    }
    this.confirmation.set(null);
    this.busy.set(true);
    this.ws.send({ type: 'confirm', confirmationId: pending.confirmationId, approved });
  }

  private handle(event: ServerEvent): void {
    switch (event.type) {
      case 'token':
        this.appendDelta(event.delta);
        break;
      case 'tool':
        this.activity.set(
          event.status === 'running' ? (TOOL_LABELS[event.name] ?? event.name) : null,
        );
        break;
      case 'users':
        this.assistant().users = event.rows;
        this.messages.update((list) => [...list]);
        break;
      case 'confirmation':
        this.activity.set(null);
        this.confirmation.set(event);
        break;
      case 'done':
        this.activity.set(null);
        this.busy.set(false);
        this.settle();
        break;
      case 'error':
        this.activity.set(null);
        this.busy.set(false);
        this.settle();
        this.push({ role: 'assistant', text: `Something went wrong: ${event.message}` });
        break;
    }
  }

  private appendDelta(delta: string): void {
    const message = this.assistant();
    message.text += delta;
    this.messages.update((list) => [...list]);
  }

  private assistant(): ChatMessage {
    const list = this.messages();
    const last = list[list.length - 1];
    if (last?.role === 'assistant' && last.streaming) {
      return last;
    }
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: '',
      streaming: true,
    };
    this.messages.set([...list, message]);
    return message;
  }

  private settle(): void {
    this.messages.update((list) =>
      list.map((message) => (message.streaming ? { ...message, streaming: false } : message)),
    );
  }

  private push(message: Omit<ChatMessage, 'id'>): void {
    this.messages.update((list) => [...list, { id: crypto.randomUUID(), ...message }]);
  }
}
