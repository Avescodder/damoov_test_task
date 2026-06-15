import { User } from '../../features/users/user.model';

export interface InitMessage {
  type: 'init';
  sessionId: string;
  token: string;
  applicationId: string;
}

export interface SendMessage {
  type: 'user_message';
  text: string;
}

export interface ConfirmMessage {
  type: 'confirm';
  confirmationId: string;
  approved: boolean;
}

export interface PingMessage {
  type: 'ping';
}

export type ClientMessage = InitMessage | SendMessage | ConfirmMessage | PingMessage;

export interface TokenEvent {
  type: 'token';
  delta: string;
}

export interface ToolEvent {
  type: 'tool';
  name: string;
  status: 'running' | 'done';
}

export interface UsersEvent {
  type: 'users';
  rows: User[];
}

export interface UserUpdatedEvent {
  type: 'user_updated';
  row: User;
}

export interface UserDeletedEvent {
  type: 'user_deleted';
  deviceToken: string;
}

export interface ConfirmationEvent {
  type: 'confirmation';
  confirmationId: string;
  action: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface DoneEvent {
  type: 'done';
}

export interface ErrorEvent {
  type: 'error';
  message: string;
}

export type ServerEvent =
  | TokenEvent
  | ToolEvent
  | UsersEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | ConfirmationEvent
  | DoneEvent
  | ErrorEvent;
