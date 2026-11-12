import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { UserCardComponent } from '../../shared/components/user-card/user-card.component';
import { UserService } from '../../core/services/user.service';
import { ApiService } from '../../core/services/api.service';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatButtonModule,
    NavbarComponent,
    UserCardComponent,
  ],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('');
  readonly suggestedUsers = signal<UserProfile[]>([]);
  readonly searchResults = signal<UserProfile[]>([]);
  readonly isLoading = signal(true);
  readonly isSearching = signal(false);
  readonly isSearchMode = signal(false);

  ngOnInit(): void {
    this.loadSuggestedUsers();
    this.setupSearch();
  }

  private loadSuggestedUsers(): void {
    this.isLoading.set(true);
    this.userService
      .getSuggestedUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.suggestedUsers.set(users as UserProfile[]);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query?.trim() ?? '';
          if (!trimmed) {
            this.isSearchMode.set(false);
            this.searchResults.set([]);
            return of([]);
          }
          this.isSearchMode.set(true);
          this.isSearching.set(true);
          return this.apiService
            .get<UserProfile[]>('/users/search/', { q: trimmed })
            .pipe(catchError(() => of([])));
        })
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      });
  }

  onFollowToggle(event: { userId: number; follow: boolean }): void {
    const action = event.follow
      ? this.userService.followUser(event.userId)
      : this.userService.unfollowUser(event.userId);

    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        // Update the local user list
        const updateUser = (users: UserProfile[]): UserProfile[] =>
          users.map((u) =>
            u.id === event.userId
              ? {
                  ...u,
                  isFollowedByCurrentUser: event.follow,
                  followerCount: event.follow
                    ? u.followerCount + 1
                    : Math.max(0, u.followerCount - 1),
                }
              : u
          );

        this.suggestedUsers.update(updateUser);
        this.searchResults.update(updateUser);
      },
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  get displayedUsers(): UserProfile[] {
    return this.isSearchMode() ? this.searchResults() : this.suggestedUsers();
  }
}
