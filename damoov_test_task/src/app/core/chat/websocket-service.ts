import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ClientMessage, InitMessage, ServerEvent } from './chat-protocol';

const PING_INTERVAL = 30_000;
const RECONNECT_DELAY = 1_500;

type Status = 'closed' | 'connecting' | 'open';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private init: InitMessage | null = null;
  private ping?: ReturnType<typeof setInterval>;
  private reconnect?: ReturnType<typeof setTimeout>;
  private readonly incoming = new Subject<ServerEvent>();

  readonly status = signal<Status>('closed');
  readonly events = this.incoming.asObservable();

  connect(init: InitMessage): void {
    this.init = init;
    this.open();
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private open(): void {
    this.status.set('connecting');
    const socket = new WebSocket(this.url());
    this.socket = socket;

    socket.onopen = () => {
      this.status.set('open');
      if (this.init) {
        socket.send(JSON.stringify(this.init));
      }
      this.startPing();
    };
    socket.onmessage = (event) => this.incoming.next(JSON.parse(event.data) as ServerEvent);
    socket.onclose = () => {
      this.status.set('closed');
      this.stopPing();
      this.scheduleReconnect();
    };
    socket.onerror = () => socket.close();
  }

  private scheduleReconnect(): void {
    if (!this.init) {
      return;
    }
    clearTimeout(this.reconnect);
    this.reconnect = setTimeout(() => this.open(), RECONNECT_DELAY);
  }

  private startPing(): void {
    this.stopPing();
    this.ping = setInterval(() => this.send({ type: 'ping' }), PING_INTERVAL);
  }

  private stopPing(): void {
    clearInterval(this.ping);
  }

  private url(): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/ws`;
  }
}
