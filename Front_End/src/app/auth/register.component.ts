import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RegisterRequest, UserRole } from './auth.model';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="register-shell">
      <div class="register-card">
        <h2>Create account</h2>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field-row">
            <label>
              First name
              <input formControlName="firstName" type="text" placeholder="First name" />
            </label>
            <label>
              Last name
              <input formControlName="lastName" type="text" placeholder="Last name" />
            </label>
          </div>
          <label>
            Username
            <input formControlName="userName" type="text" placeholder="Username" />
          </label>
          <label>
            Email
            <input formControlName="email" type="email" placeholder="email@example.com" />
          </label>
          <div class="field-row">
            <label>
              Password
              <input formControlName="password" type="password" placeholder="Password" />
            </label>
            <label>
              Confirm password
              <input
                formControlName="confirmPassword"
                type="password"
                placeholder="Confirm password"
              />
            </label>
          </div>
          <label>
            Role
            <select formControlName="role">
              <option [ngValue]="UserRole.ProdectOwner">Product Owner</option>
              <option [ngValue]="UserRole.ScrumMaster">Scrum Master</option>
              <option [ngValue]="UserRole.Developer">Developer</option>
              <option [ngValue]="UserRole.Tester">Tester</option>
              <option [ngValue]="UserRole.Observer">Observer</option>
            </select>
          </label>
          <button type="submit" [disabled]="form.invalid">Register</button>
        </form>
        <p class="helper-text">
          Already have an account?
          <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .register-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .register-card {
        width: min(520px, 100%);
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

      .field-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }

      input,
      select {
        width: 100%;
        border-radius: 10px;
        border: 1px solid #d8dee9;
        padding: 10px 12px;
        font-size: 14px;
        background: #ffffff;
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
export class RegisterComponent {
  UserRole = UserRole;
  private fb = inject(FormBuilder);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    role: [UserRole.Developer, Validators.required]
  });

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    const payload = this.form.value as RegisterRequest;
    if (payload.password !== payload.confirmPassword) {
      window.alert('Passwords do not match.');
      return;
    }

    this.auth.register(payload).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        window.alert('Register failed. Please check your data.');
      }
    });
  }
}
