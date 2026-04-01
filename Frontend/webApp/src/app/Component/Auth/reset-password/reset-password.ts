import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
      return;
    }

    const { newPassword, confirmNewPassword } = this.form.getRawValue();
    if (newPassword !== confirmNewPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      this.successMessage = '';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.resetPassword({ token, newPassword, confirmNewPassword }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Mot de passe reinitialise avec succes. Redirection vers la connexion...';
        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 1200);
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        if (error instanceof Error && error.message.trim().length > 0) {
          this.errorMessage = error.message;
          return;
        }
        this.errorMessage = 'Impossible de reinitialiser le mot de passe.';
      }
    });
  }
}
