import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../Service/auth.service';
import { AuthResponse } from '../model/auth.model';
import { RoleGuard } from '../Service/role.guard';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private roleGuard = inject(RoleGuard);
  errorMessage: string = '';
  isLoading: boolean = false;
  
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });
  
  constructor(private auth: AuthService, private router: Router) {}
  
  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    this.auth
      .login(this.form.value as { email: string; password: string; rememberMe: boolean })
      .subscribe({
        next: (response: AuthResponse) => {
          this.errorMessage = '';
          console.log('Login successful:', response);
      
          this.roleGuard.redirectToDashboard();
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Login failed. Check your credentials.';
          console.error('Login error:', err);
        }
      });
  }
}
