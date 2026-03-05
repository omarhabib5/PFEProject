import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../Service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginRequest } from '../model/auth.model';
import { RoleGuard } from '../Service/role.guard';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private roleNavigator = inject(RoleGuard);

  errorMessage: string = '';
  isLoading: boolean = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.roleNavigator.redirectToDashboard();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: LoginRequest = this.form.getRawValue();

    this.isLoading = true;
    this.auth
      .login(payload)
      .subscribe({
        next: () => {
          this.errorMessage = '';

          const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
          if (typeof returnUrl === 'string' && returnUrl.startsWith('/')) {
            void this.router.navigateByUrl(returnUrl);
          } else {
            this.roleNavigator.redirectToDashboard();
          }

          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.errorMessage = this.extractErrorMessage(error);
        }
      });
  }

  private extractErrorMessage(error: unknown): string {
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

    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Login failed. Check your credentials and try again.';
  }
}
