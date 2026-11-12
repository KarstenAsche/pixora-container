import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../core/services/user.service';
import { PostService } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { PostDetailComponent } from '../../shared/components/post-detail/post-detail.component';
import { UserProfile } from '../../core/models/user.model';
import { Post } from '../../core/models/post.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    NavbarComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly postService = inject(PostService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<UserProfile | null>(null);
  readonly posts = signal<Post[]>([]);
  readonly followers = signal<UserProfile[]>([]);
  readonly following = signal<UserProfile[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal('');

  get isOwnProfile(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === this.profile()?.id;
  }

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const userId = Number(params['id']);
          this.isLoading.set(true);
          this.posts.set([]);
          this.followers.set([]);
          this.following.set([]);
          return this.userService.fetchProfile(userId);
        })
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.isLoading.set(false);
          this.loadUserPosts(profile.id);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.loadError.set(
            err?.status === 404
              ? 'User not found.'
              : err?.status === 0
              ? 'Cannot reach the server.'
              : 'Failed to load profile.'
          );
        },
      });
  }

  loadUserPosts(userId: number): void {
    this.postService
      .getUserPosts(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (posts) => this.posts.set(posts),
      });
  }

  loadFollowers(userId: number): void {
    this.userService
      .getFollowers(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.followers.set(users as UserProfile[]),
      });
  }

  loadFollowing(userId: number): void {
    this.userService
      .getFollowing(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.following.set(users as UserProfile[]),
      });
  }

  onTabChange(index: number): void {
    const profileId = this.profile()?.id;
    if (!profileId) return;
    if (index === 1 && this.followers().length === 0) {
      this.loadFollowers(profileId);
    }
    if (index === 2 && this.following().length === 0) {
      this.loadFollowing(profileId);
    }
  }

  onFollowToggle(): void {
    const profile = this.profile();
    if (!profile) return;

    const action = profile.isFollowedByCurrentUser
      ? this.userService.unfollowUser(profile.id)
      : this.userService.followUser(profile.id);

    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.profile.update((p) =>
          p
            ? {
                ...p,
                isFollowedByCurrentUser: !p.isFollowedByCurrentUser,
                followerCount: p.isFollowedByCurrentUser
                  ? (p.followerCount ?? 1) - 1
                  : (p.followerCount ?? 0) + 1,
              }
            : p
        );
      },
    });
  }

  openEditDialog(): void {
    const dialogRef = this.dialog.open(ProfileEditComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: this.profile(),
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.profile.set(updated);
      }
    });
  }

  openPostDetail(post: Post): void {
    const dialogRef = this.dialog.open(PostDetailComponent, {
      data: { post },
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'post-detail-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.deleted) {
        this.posts.update((prev) => prev.filter((p) => p.id !== post.id));
        const profile = this.profile();
        if (profile) {
          this.profile.set({ ...profile, postCount: Math.max(0, profile.postCount - 1) });
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  trackByPost(_index: number, post: Post): number {
    return post.id;
  }
}
