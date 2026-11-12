import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;
  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  // Clear the error if passwords match (only clear passwordMismatch)
  const errors = { ...confirmPassword.errors };
  delete errors['passwordMismatch'];
  confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly appName = environment.appName;
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly serverError = signal('');

  readonly registerForm = this.fb.group(
    {
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(150),
          Validators.pattern(/^[\w.@+-]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username, email, password, confirmPassword } = this.registerForm.value;
    this.isLoading.set(true);
    this.serverError.set('');

    this.authService
      .register({ username: username!, email: email!, password: password!, confirmPassword: confirmPassword! })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/explore']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const body = err?.error;
          if (body && typeof body === 'object') {
            // Map DRF field errors onto form controls when possible
            const fieldMap: Record<string, string> = {
              username: 'username', email: 'email',
              password: 'password', confirmPassword: 'confirmPassword',
            };
            let unhandled: string[] = [];
            for (const key of Object.keys(body)) {
              const msgs: string[] = Array.isArray(body[key]) ? body[key] : [String(body[key])];
              const controlKey = fieldMap[key];
              if (controlKey) {
                this.registerForm.get(controlKey)?.setErrors({ serverError: msgs[0] });
              } else {
                unhandled = [...unhandled, ...msgs];
              }
            }
            if (unhandled.length) this.serverError.set(unhandled.join(' '));
          } else if (err?.status === 0) {
            this.serverError.set('Cannot reach the server. Check your connection.');
          } else {
            this.serverError.set('Registration failed. Please try again.');
          }
        },
      });
  }
}
