import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="login-shell">
      <div class="login-card">
        <h2>Login</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label>
            Email
            <input formControlName="email" type="email" placeholder="email@example.com" />
          </label>
          <label>
            Password
            <input formControlName="password" type="password" placeholder="Password" />
          </label>
          <label class="checkbox-row">
            <input formControlName="rememberMe" type="checkbox" />
            Remember me
          </label>
          <button type="submit" [disabled]="form.invalid">Sign in</button>
        </form>
        <p class="helper-text">
          No account?
          <a routerLink="/register">Create one</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .login-card {
        width: 100%;
        max-width: 360px;
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 16px 32px rgba(18, 24, 40, 0.12);
      }

      h2 {
        margin: 0 0 16px;
        font-size: 20px;
      }

      form {
        display: grid;
        gap: 12px;
      }

      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #42526d;
      }

      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      input {
        width: 100%;
        border-radius: 10px;
        border: 1px solid #d8dee9;
        padding: 10px 12px;
        font-size: 14px;
      }

      button {
        border: none;
        border-radius: 10px;
        background: #2563eb;
        color: #ffffff;
        padding: 10px 12px;
        font-size: 14px;
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .helper-text {
        margin: 16px 0 0;
        font-size: 13px;
        color: #52607a;
        text-align: center;
      }

      .helper-text a {
        color: #2563eb;
        text-decoration: none;
      }
    `
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false]
  });

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.auth
      .login(this.form.value as { email: string; password: string; rememberMe: boolean })
      .subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        window.alert('Login failed. Check your credentials.');
      }
    });
  }
}
