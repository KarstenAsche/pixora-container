import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post } from '../../../core/models/post.model';
import { Comment } from '../../../core/models/comment.model';

export interface PostDetailDialogData {
  post: Post;
}

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent implements OnInit {
  private readonly postService = inject(PostService);
  readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<PostDetailComponent>);
  readonly data = inject<PostDetailDialogData>(MAT_DIALOG_DATA);

  post = signal<Post>({ ...this.data.post });
  comments = signal<Comment[]>([]);
  isLoadingComments = signal(true);
  actionError = signal('');
  newCommentText = '';

  get isOwner(): boolean {
    return this.authService.getCurrentUser()?.id === this.post().owner.id;
  }

  ngOnInit(): void {
    this.postService
      .getComments(this.post().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.comments.set(c);
          this.isLoadingComments.set(false);
        },
        error: () => this.isLoadingComments.set(false),
      });
  }

  onLikeToggle(): void {
    const p = this.post();
    const action = p.isLikedByCurrentUser
      ? this.postService.unlikePost(p.id)
      : this.postService.likePost(p.id);

    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.actionError.set('');
        this.post.update((prev) => ({
          ...prev,
          isLikedByCurrentUser: !prev.isLikedByCurrentUser,
          likeCount: prev.isLikedByCurrentUser ? prev.likeCount - 1 : prev.likeCount + 1,
        }));
      },
      error: () => this.actionError.set('Could not update like. Please try again.'),
    });
  }

  onAddComment(): void {
    const text = this.newCommentText.trim();
    if (!text) return;
    this.postService
      .addComment(this.post().id, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comment) => {
          this.actionError.set('');
          this.comments.update((prev) => [...prev, comment]);
          this.post.update((p) => ({ ...p, commentCount: p.commentCount + 1 }));
          this.newCommentText = '';
        },
        error: () => this.actionError.set('Could not post comment. Please try again.'),
      });
  }

  onDeleteComment(commentId: number): void {
    this.postService
      .deleteComment(commentId, this.post().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionError.set('');
          this.comments.update((prev) => prev.filter((c) => c.id !== commentId));
          this.post.update((p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
        },
        error: () => this.actionError.set('Could not delete comment. Please try again.'),
      });
  }

  onDeletePost(): void {
    this.postService
      .deletePost(this.post().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.dialogRef.close({ deleted: true }),
        error: () => this.actionError.set('Could not delete post. Please try again.'),
      });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
