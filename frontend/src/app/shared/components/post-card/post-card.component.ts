import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Post } from '../../../core/models/post.model';
import { AuthService } from '../../../core/services/auth.service';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    TimeAgoPipe,
  ],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCardComponent {
  @Input({ required: true }) post!: Post;

  @Output() liked = new EventEmitter<number>();
  @Output() unliked = new EventEmitter<number>();
  @Output() deleted = new EventEmitter<number>();
  @Output() commentClicked = new EventEmitter<number>();

  readonly authService = inject(AuthService);

  get isOwner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === this.post.owner.id;
  }

  onLikeToggle(): void {
    if (this.post.isLikedByCurrentUser) {
      this.unliked.emit(this.post.id);
    } else {
      this.liked.emit(this.post.id);
    }
  }

  onDelete(): void {
    this.deleted.emit(this.post.id);
  }

  onCommentClick(): void {
    this.commentClicked.emit(this.post.id);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
