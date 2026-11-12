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
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Comment } from '../../../core/models/comment.model';
import { AuthService } from '../../../core/services/auth.service';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    TimeAgoPipe,
  ],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentSectionComponent {
  @Input({ required: true }) postId!: number;
  @Input() comments: Comment[] = [];

  @Output() commentAdded = new EventEmitter<string>();
  @Output() commentDeleted = new EventEmitter<number>();

  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly commentForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(2200)]],
  });

  isOwnComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === comment.user.id;
  }

  onSubmit(): void {
    if (this.commentForm.valid && this.commentForm.value.text?.trim()) {
      this.commentAdded.emit(this.commentForm.value.text.trim());
      this.commentForm.reset();
    }
  }

  onDeleteComment(commentId: number): void {
    this.commentDeleted.emit(commentId);
  }
}
