import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User, AuthResponse } from '../models/user.model';

interface RefreshResponse { access: string; refresh?: string; }

const ACCESS_TOKEN_KEY = 'pixora_access';
const REFRESH_TOKEN_KEY = 'pixora_refresh';
const USER_KEY = 'pixora_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(this.loadCachedUser());
  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.currentUser$.pipe(map((u) => u !== null));

  constructor() {
    if (this.getToken()) {
      this.loadCurrentUser().pipe(catchError(() => EMPTY)).subscribe();
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>('/auth/login/', { username, password })
      .pipe(
        tap((response) => {
          this.setTokens(response.access, response.refresh);
          this.cacheUser(response.user);
          this.currentUserSubject.next(response.user);
        })
      );
  }

  register(userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>('/auth/register/', userData)
      .pipe(
        tap((response) => {
          this.setTokens(response.access, response.refresh);
          this.cacheUser(response.user);
          this.currentUserSubject.next(response.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<RefreshResponse> {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.api
      .post<RefreshResponse>('/auth/refresh/', { refresh })
      .pipe(
        tap((response) => {
          this.setTokens(response.access, response.refresh ?? refresh ?? '');
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  private loadCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private cacheUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  loadCurrentUser(): Observable<User> {
    return this.api.get<User>('/users/me/').pipe(
      tap((user) => {
        this.cacheUser(user);
        this.currentUserSubject.next(user);
      })
    );
  }

  setCurrentUser(user: User): void {
    this.cacheUser(user);
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }
}
