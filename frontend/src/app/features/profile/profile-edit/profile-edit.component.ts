import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProfileEditComponent>);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly profile: UserProfile = inject(MAT_DIALOG_DATA);

  readonly isLoading = signal(false);
  avatarPreviewUrl: string | null = null;
  selectedAvatarFile: File | null = null;

  readonly editForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.editForm.patchValue({
      email: this.profile.email,
      bio: this.profile.bio ?? '',
    });
    this.avatarPreviewUrl = this.profile.avatar ?? null;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) return;
      this.selectedAvatarFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreviewUrl = e.target?.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    formData.append('email', this.editForm.value.email!);
    formData.append('bio', this.editForm.value.bio ?? '');
    if (this.selectedAvatarFile) {
      formData.append('avatar', this.selectedAvatarFile);
    }

    this.isLoading.set(true);
    this.userService.updateProfile(formData).subscribe({
      next: (updated) => {
        this.isLoading.set(false);
        this.snackBar.open('Profile updated successfully!', 'Close', {
          duration: 3000,
        });
        this.dialogRef.close(updated);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
