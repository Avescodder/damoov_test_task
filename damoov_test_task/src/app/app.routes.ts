import { Routes } from '@angular/router';
import { UsersPage } from './features/users/users-page/users-page';

export const routes: Routes = [
  { path: '', component: UsersPage },
  { path: '**', redirectTo: '' },
];
