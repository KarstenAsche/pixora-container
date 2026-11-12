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
import { UserProfile } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  @Input({ required: true }) user!: UserProfile;
  @Output() followToggled = new EventEmitter<{ userId: number; follow: boolean }>();

  private readonly authService = inject(AuthService);

  get isOwnProfile(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === this.user.id;
  }

  onFollowToggle(): void {
    this.followToggled.emit({
      userId: this.user.id,
      follow: !this.user.isFollowedByCurrentUser,
    });
  }
}
