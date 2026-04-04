import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../Service/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  errorMessage = '';
  successMessage = '';
  isSubmitting = false;

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token.trim()) {
      this.errorMessage = 'Lien invalide: token manquant.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    const { newPassword, confirmNewPassword } = this.form.getRawValue();
    if (newPassword !== confirmNewPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.resetPassword({ token, newPassword, confirmNewPassword }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Password reset successfully. Redirecting to login...';
        this.cdr.detectChanges();
        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 1200);
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        this.errorMessage = this.extractErrorMessage(error);
        this.cdr.detectChanges();
      }
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return error.error;
      }

      if (error.error && typeof error.error === 'object') {
        const maybeMessage = (error.error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
          return maybeMessage;
        }
      }

      if (error.message.trim().length > 0) {
        return error.message;
      }
    }

    return 'Unable to reset the password.';
  }
}
