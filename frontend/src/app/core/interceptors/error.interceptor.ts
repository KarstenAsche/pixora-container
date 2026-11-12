import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

function getErrorMessage(error: {
  status: number;
  error?: unknown;
}): string {
  const body = error.error;

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;

    // DRF detail string
    if (typeof obj['detail'] === 'string') return obj['detail'];

    // Collect all field-level errors (DRF returns { field: [msg, ...], ... })
    const fieldErrors: string[] = [];
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val)) {
        val.forEach((msg) => fieldErrors.push(`${key}: ${String(msg)}`));
      } else if (typeof val === 'string') {
        fieldErrors.push(`${key}: ${val}`);
      }
    }
    if (fieldErrors.length > 0) return fieldErrors.join('\n');
  }

  if (typeof body === 'string' && body.length < 200) return body;

  switch (error.status) {
    case 400: return 'Invalid request. Please check your input.';
    case 401: return 'Incorrect email or password.';
    case 403: return 'You do not have permission to do that.';
    case 404: return 'Not found.';
    case 409: return 'A conflict occurred (duplicate entry).';
    case 413: return 'File is too large.';
    case 500: return 'Server error. Please try again later.';
    case 0:   return 'Cannot reach the server. Check your connection.';
    default:  return 'An unexpected error occurred.';
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error) => {
      if (!environment.production) {
        console.error('[HTTP Error]', error);
      }

      // Skip showing snackbar for 401 (handled by JWT interceptor for token refresh)
      if (error.status !== 401) {
        const message = getErrorMessage(error);
        snackBar.open(message, 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      }

      return throwError(() => error);
    })
  );
};
