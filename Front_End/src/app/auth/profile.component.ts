import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';
import { ChangePasswordRequest, UserProfile } from './auth.model';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="profile-shell">
      <header class="profile-header">
        <div class="profile-title">
          <h2>Profile</h2>
          <p>Manage your account details</p>
        </div>
        <button type="button" class="ghost-button" (click)="onLogout()">Logout</button>
      </header>

      <section class="profile-card" *ngIf="profile">
        <div class="avatar-block">
          <img
            class="avatar"
            [src]="avatarPreview || profile.profileImageUrl || defaultAvatar"
            alt="Profile avatar"
          />
          <div class="avatar-actions">
            <input type="file" accept="image/*" (change)="onAvatarSelected($event)" />
            <button type="button" (click)="saveAvatar()" [disabled]="!avatarPreview">
              Save avatar
            </button>
          </div>
        </div>
        <div class="profile-info">
          <h3>{{ profile.firstName }} {{ profile.lastName }}</h3>
          <p>{{ profile.email }}</p>
          <span class="role-chip">{{ profile.roleDisplayName }}</span>
        </div>
      </section>

      <section class="profile-card">
        <h3>Change password</h3>
        <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
          <label>
            Current password
            <input formControlName="currentPassword" type="password" />
          </label>
          <label>
            New password
            <input formControlName="newPassword" type="password" />
          </label>
          <label>
            Confirm new password
            <input formControlName="confirmNewPassword" type="password" />
          </label>
          <button type="submit" [disabled]="passwordForm.invalid">Update password</button>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .profile-shell {
        max-width: 920px;
        margin: 0 auto;
        padding: 24px;
        display: grid;
        gap: 20px;
      }

      .profile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .profile-title h2 {
        margin: 0;
        font-size: 22px;
      }

      .profile-title p {
        margin: 4px 0 0;
        color: #5b667b;
        font-size: 13px;
      }

      .profile-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 12px 24px rgba(20, 30, 60, 0.08);
        display: grid;
        gap: 16px;
      }

      .avatar-block {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e6e8ef;
      }

      .avatar-actions {
        display: grid;
        gap: 8px;
      }

      .profile-info h3 {
        margin: 0;
        font-size: 18px;
      }

      .profile-info p {
        margin: 4px 0 8px;
        color: #5b667b;
      }

      .role-chip {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        background: #eef2ff;
        color: #3b4aa1;
        font-size: 12px;
        font-weight: 600;
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

      input {
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
        width: fit-content;
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .ghost-button {
        background: #ffffff;
        color: #2563eb;
        border: 1px solid #c7d2fe;
      }
    `
  ]
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  profile: UserProfile | null = null;
  avatarPreview = '';
  defaultAvatar = 'https://ui-avatars.com/api/?background=E9ECF7&color=27304A&name=User';

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: (profile) => (this.profile = profile),
      error: () => window.alert('Failed to load profile.')
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  saveAvatar(): void {
    if (!this.avatarPreview) {
      return;
    }

    this.auth.updateProfileImage({ imageUrl: this.avatarPreview }).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.avatarPreview = '';
      },
      error: () => window.alert('Failed to update avatar.')
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    const payload = this.passwordForm.value as ChangePasswordRequest;
    if (payload.newPassword !== payload.confirmNewPassword) {
      window.alert('Passwords do not match.');
      return;
    }

    this.auth.changePassword(payload).subscribe({
      next: () => {
        window.alert('Password updated.');
        this.passwordForm.reset();
      },
      error: () => window.alert('Failed to update password.')
    });
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
