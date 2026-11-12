import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'explore',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [loginGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
    canActivate: [loginGuard],
  },
  {
    path: 'feed',
    loadComponent: () =>
      import('./features/feed/feed.component').then((m) => m.FeedComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile/:id',
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/explore/explore.component').then(
        (m) => m.ExploreComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'explore',
  },
];
