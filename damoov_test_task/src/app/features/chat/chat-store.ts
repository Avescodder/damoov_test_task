import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebSocketService } from '../../core/chat/websocket-service';
import { ConfirmationEvent, ServerEvent } from '../../core/chat/chat-protocol';
import { User } from '../users/user.model';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  note?: string;
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

const FLASH_MS = 1500;
const FADE_MS = 450;

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

  readonly panelUsers = signal<User[]>([]);
  readonly changed = signal<ReadonlySet<string>>(new Set());
  readonly flashing = signal<ReadonlySet<string>>(new Set());
  readonly deleting = signal<ReadonlySet<string>>(new Set());

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
        this.panelUsers.set(event.rows);
        this.assistant().note = `Showed ${event.rows.length} users in the panel on the left.`;
        this.messages.update((list) => [...list]);
        break;
      case 'user_updated':
        this.mergeUser(event.row);
        break;
      case 'user_deleted':
        this.removeUser(event.deviceToken);
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

  private mergeUser(row: User): void {
    const token = row.DeviceToken;
    this.panelUsers.update((list) => {
      const index = list.findIndex((user) => user.DeviceToken === token);
      if (index === -1) {
        return [row, ...list];
      }
      const next = [...list];
      next[index] = row;
      return next;
    });
    this.changed.update((tokens) => new Set(tokens).add(token));
    this.flashing.update((tokens) => new Set(tokens).add(token));
    setTimeout(() => this.flashing.update((tokens) => without(tokens, token)), FLASH_MS);
  }

  private removeUser(token: string): void {
    this.deleting.update((tokens) => new Set(tokens).add(token));
    this.changed.update((tokens) => without(tokens, token));
    setTimeout(() => {
      this.panelUsers.update((list) => list.filter((user) => user.DeviceToken !== token));
      this.deleting.update((tokens) => without(tokens, token));
    }, FADE_MS);
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

function without(tokens: ReadonlySet<string>, token: string): ReadonlySet<string> {
  const next = new Set(tokens);
  next.delete(token);
  return next;
}
