import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PostService } from '../../../core/services/post.service';

@Component({
  selector: 'app-upload-modal',
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
  ],
  templateUrl: './upload-modal.component.html',
  styleUrls: ['./upload-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UploadModalComponent>);
  private readonly postService = inject(PostService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly uploadForm = this.fb.group({
    caption: ['', [Validators.maxLength(2200)]],
  });

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isLoading = signal(false);
  isDragOver = signal(false);
  errorMessage = signal('');

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files[0]) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  private processFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Image must be smaller than 5MB.');
      return;
    }
    this.errorMessage.set('');
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.errorMessage.set('');
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      this.errorMessage.set('Please select an image to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    const caption = this.uploadForm.value.caption ?? '';
    formData.append('caption', caption);

    this.isLoading.set(true);
    this.postService.createPost(formData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Post created successfully!', 'Close', {
          duration: 3000,
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        const body = err?.error;
        if (body?.image) {
          this.errorMessage.set(Array.isArray(body.image) ? body.image[0] : String(body.image));
        } else if (err?.status === 413) {
          this.errorMessage.set('File is too large. Maximum size is 5 MB.');
        } else if (err?.status === 0) {
          this.errorMessage.set('Cannot reach the server. Check your connection.');
        } else {
          this.errorMessage.set('Upload failed. Please try again.');
        }
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
