import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { User, UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly currentProfileSubject =
    new BehaviorSubject<UserProfile | null>(null);
  readonly currentProfile$ = this.currentProfileSubject.asObservable();

  private readonly suggestedUsersSubject = new BehaviorSubject<User[]>([]);
  readonly suggestedUsers$ = this.suggestedUsersSubject.asObservable();

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this.isLoadingSubject.asObservable();

  fetchProfile(userId: number): Observable<UserProfile> {
    this.isLoadingSubject.next(true);
    return this.api.get<UserProfile>(`/users/${userId}/`).pipe(
      tap((profile) => {
        this.currentProfileSubject.next(profile);
        this.isLoadingSubject.next(false);
      })
    );
  }

  updateProfile(formData: FormData): Observable<UserProfile> {
    return this.api.patchFormData<UserProfile>('/users/me/', formData).pipe(
      tap((profile) => {
        this.currentProfileSubject.next(profile);
        this.auth.setCurrentUser(profile);
      })
    );
  }

  followUser(userId: number): Observable<unknown> {
    return this.api.post<unknown>(`/users/${userId}/follow/`, {}).pipe(
      tap(() => {
        const profile = this.currentProfileSubject.getValue();
        if (profile && profile.id === userId) {
          this.currentProfileSubject.next({
            ...profile,
            isFollowedByCurrentUser: true,
            followerCount: profile.followerCount + 1,
          });
        }
      })
    );
  }

  unfollowUser(userId: number): Observable<void> {
    return this.api.post<void>(`/users/${userId}/unfollow/`, {}).pipe(
      tap(() => {
        const profile = this.currentProfileSubject.getValue();
        if (profile && profile.id === userId) {
          this.currentProfileSubject.next({
            ...profile,
            isFollowedByCurrentUser: false,
            followerCount: Math.max(0, profile.followerCount - 1),
          });
        }
      })
    );
  }

  getFollowers(userId: number): Observable<User[]> {
    return this.api.get<User[]>(`/users/${userId}/followers/`);
  }

  getFollowing(userId: number): Observable<User[]> {
    return this.api.get<User[]>(`/users/${userId}/following/`);
  }

  getSuggestedUsers(): Observable<User[]> {
    return this.api.get<User[]>('/users/suggested/').pipe(
      tap((users) => {
        this.suggestedUsersSubject.next(users);
      })
    );
  }
}
