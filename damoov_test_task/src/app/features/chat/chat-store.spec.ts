import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ServerEvent } from '../../core/chat/chat-protocol';
import { WebSocketService } from '../../core/chat/websocket-service';
import { User } from '../users/user.model';
import { ChatStore } from './chat-store';

function makeUser(token: string, status: 'Active' | 'Inactive' = 'Active'): User {
  return {
    DeviceToken: token,
    DateCreated: '2026-05-30T08:50:21.365958',
    Status: status,
    ActivityStatus: 'No Data',
    UserProfile: { FirstName: null, LastName: null, Email: null, Phone: null, ImageUrl: null },
    MobileDevice: { DeviceModel: null, OsType: '', VirtualImei: null },
    AccountInfo: { CompanyName: 'Damoov', ApplicationName: 'iOS SDK[UAT]', InstanceName: 'Common' },
    UserFields: null,
  };
}

class FakeWebSocketService {
  readonly status = signal<'closed' | 'connecting' | 'open'>('open');
  readonly events = new Subject<ServerEvent>();
  connect = (): void => undefined;
  send = (): void => undefined;
}

describe('ChatStore', () => {
  let ws: FakeWebSocketService;
  let store: ChatStore;

  beforeEach(() => {
    ws = new FakeWebSocketService();
    TestBed.configureTestingModule({
      providers: [{ provide: WebSocketService, useValue: ws }],
    });
    store = TestBed.inject(ChatStore);
  });

  it('fills the panel on a users event and notes it in the chat', () => {
    ws.events.next({ type: 'users', rows: [makeUser('aaaa-1'), makeUser('bbbb-2')] });

    expect(store.panelUsers().length).toBe(2);
    const last = store.messages().at(-1);
    expect(last?.role).toBe('assistant');
    expect(last?.note).toContain('Showed 2 users');
  });

  it('merges an updated row by DeviceToken and flashes it', () => {
    vi.useFakeTimers();
    ws.events.next({ type: 'users', rows: [makeUser('aaaa-1', 'Active'), makeUser('bbbb-2')] });

    ws.events.next({ type: 'user_updated', row: makeUser('aaaa-1', 'Inactive') });

    expect(store.panelUsers().length).toBe(2);
    expect(store.panelUsers()[0].Status).toBe('Inactive');
    expect(store.changed().has('aaaa-1')).toBe(true);
    expect(store.flashing().has('aaaa-1')).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(store.flashing().has('aaaa-1')).toBe(false);
    expect(store.changed().has('aaaa-1')).toBe(true);
    vi.useRealTimers();
  });

  it('removes a deleted row after the fade and drops its highlight', () => {
    vi.useFakeTimers();
    ws.events.next({ type: 'users', rows: [makeUser('aaaa-1'), makeUser('bbbb-2')] });
    ws.events.next({ type: 'user_updated', row: makeUser('aaaa-1', 'Inactive') });

    ws.events.next({ type: 'user_deleted', deviceToken: 'aaaa-1' });
    expect(store.deleting().has('aaaa-1')).toBe(true);
    expect(store.panelUsers().length).toBe(2);

    vi.advanceTimersByTime(450);
    expect(store.panelUsers().length).toBe(1);
    expect(store.panelUsers()[0].DeviceToken).toBe('bbbb-2');
    expect(store.deleting().has('aaaa-1')).toBe(false);
    expect(store.changed().has('aaaa-1')).toBe(false);
    vi.useRealTimers();
  });
});
