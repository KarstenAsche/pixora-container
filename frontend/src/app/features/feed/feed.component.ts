import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PostService } from '../../core/services/post.service';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CommentSectionComponent } from '../../shared/components/comment-section/comment-section.component';
import { UploadModalComponent } from '../../shared/components/upload-modal/upload-modal.component';
import { Post } from '../../core/models/post.model';
import { Comment } from '../../core/models/comment.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PostCardComponent,
    NavbarComponent,
    CommentSectionComponent,
  ],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedComponent implements OnInit {
  private readonly postService = inject(PostService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly posts$ = this.postService.posts$;
  readonly isLoading$ = this.postService.isLoading$;

  currentPage = signal(1);
  hasMore = signal(true);
  totalCount = signal(0);
  feedError = signal('');
  expandedComments = signal<Record<number, Comment[]>>({});
  showComments = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.loadFeed(1);
  }

  loadFeed(page: number): void {
    this.feedError.set('');
    this.postService
      .fetchFeed(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.totalCount.set(response.count);
          this.hasMore.set(response.next !== null);
        },
        error: (err) => {
          this.feedError.set(
            err?.status === 0
              ? 'Cannot reach the server. Check your connection.'
              : 'Failed to load posts. Please try again.'
          );
        },
      });
  }

  loadMore(): void {
    const next = this.currentPage() + 1;
    this.currentPage.set(next);
    this.loadFeed(next);
  }

  onLike(postId: number): void {
    this.postService.likePost(postId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onUnlike(postId: number): void {
    this.postService.unlikePost(postId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onDelete(postId: number): void {
    this.postService
      .deletePost(postId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Post deleted', 'Close', { duration: 3000 });
        },
      });
  }

  onCommentClick(postId: number): void {
    const current = new Set(this.showComments());
    if (current.has(postId)) {
      current.delete(postId);
    } else {
      current.add(postId);
      // Load comments if not already loaded
      if (!this.expandedComments()[postId]) {
        this.postService
          .getComments(postId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (comments) => {
              this.expandedComments.update((prev) => ({
                ...prev,
                [postId]: comments,
              }));
            },
          });
      }
    }
    this.showComments.set(current);
  }

  onCommentAdded(postId: number, text: string): void {
    this.postService
      .addComment(postId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comment) => {
          this.expandedComments.update((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] ?? []), comment],
          }));
        },
      });
  }

  onCommentDeleted(postId: number, commentId: number): void {
    this.postService
      .deleteComment(commentId, postId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.expandedComments.update((prev) => ({
            ...prev,
            [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
          }));
        },
      });
  }

  openUploadModal(): void {
    const dialogRef = this.dialog.open(UploadModalComponent, {
      width: '540px',
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.currentPage.set(1);
        this.loadFeed(1);
      }
    });
  }

  trackByPost(_index: number, post: Post): number {
    return post.id;
  }

  isCommentsOpen(postId: number): boolean {
    return this.showComments().has(postId);
  }

  getCommentsForPost(postId: number): Comment[] {
    return this.expandedComments()[postId] ?? [];
  }
}
