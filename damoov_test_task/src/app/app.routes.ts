import { Routes } from '@angular/router';
import { ChatPage } from './features/chat/chat-page/chat-page';
import { UsersPage } from './features/users/users-page/users-page';

export const routes: Routes = [
  { path: '', component: ChatPage },
  { path: 'users', component: UsersPage },
  { path: '**', redirectTo: '' },
];
