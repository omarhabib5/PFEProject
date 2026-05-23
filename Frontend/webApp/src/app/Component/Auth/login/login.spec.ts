import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { vi } from 'vitest';

import { Login } from './login';
import { AuthService } from '../Service/auth.service';
import { RoleGuard } from '../Service/role.guard';

const mockAuthService = {
  isAuthenticated: vi.fn().mockReturnValue(false),
  login: vi.fn().mockReturnValue(of({})),
  forgotPassword: vi.fn().mockReturnValue(of({})),
};

const mockRoleGuard = {
  redirectToDashboard: vi.fn(),
};

const mockRouter = {
  navigate: vi.fn(),
  navigateByUrl: vi.fn().mockResolvedValue(true),
  url: '/',
  parseUrl: vi.fn().mockReturnValue({ queryParams: {} }),
};


  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    mockAuthService.isAuthenticated.mockClear();
    mockAuthService.login.mockClear();
    mockAuthService.forgotPassword.mockClear();
    mockRoleGuard.redirectToDashboard.mockClear();

    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule],
      providers: [
        { provide: AuthService,  useValue: mockAuthService },
        { provide: RoleGuard,    useValue: mockRoleGuard   },
        { provide: Router,       useValue: mockRouter      },
        { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  
  describe('Initialisation', () => {

    it('TC01 – devrait créer le composant sans erreur', () => {
      expect(component).toBeTruthy();
    });

    it('TC02 – devrait initialiser le formulaire avec des champs vides', () => {
      expect(component.form.value).toEqual({
        email: '',
        password: '',
        rememberMe: false,
      });
    });

    it('TC03 – devrait rediriger vers le dashboard si déjà authentifié', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      component.ngOnInit();
      expect(mockRoleGuard.redirectToDashboard).toHaveBeenCalled();
    });

    it('TC04 – ne devrait pas rediriger si non authentifié', () => {
      mockRoleGuard.redirectToDashboard.mockClear();
      mockAuthService.isAuthenticated.mockReturnValue(false);
      component.ngOnInit();
      expect(mockRoleGuard.redirectToDashboard).not.toHaveBeenCalled();
    });

  });

  
  describe('Validation du formulaire', () => {

    it('TC05 – formulaire invalide si tous les champs sont vides', () => {
      expect(component.form.valid).toBeFalsy();
    });

    it('TC06 – formulaire invalide si email manquant', () => {
      component.form.setValue({ email: '', password: 'Admin@123', rememberMe: false });
      expect(component.form.controls['email'].valid).toBeFalsy();
    });

    it('TC07 – formulaire invalide si mot de passe manquant', () => {
      component.form.setValue({ email: 'admin@poulina.com', password: '', rememberMe: false });
      expect(component.form.controls['password'].valid).toBeFalsy();
    });

    it('TC08 – formulaire invalide si email mal formaté', () => {
      component.form.setValue({ email: 'notanemail', password: 'Admin@123', rememberMe: false });
      expect(component.form.controls['email'].valid).toBeFalsy();
    });

    it('TC09 – formulaire invalide si mot de passe inférieur à 6 caractères', () => {
      component.form.setValue({ email: 'admin@poulina.com', password: '123', rememberMe: false });
      expect(component.form.controls['password'].valid).toBeFalsy();
    });

    it('TC10 – formulaire valide avec email et mot de passe corrects', () => {
      component.form.setValue({
        email: 'admin@gmail.com',
        password: 'aaaaaaaa',
        rememberMe: false,
      });
      expect(component.form.valid).toBeTruthy();
    });

  });

  // ══════════════════════════════════════════
  // 3. SOUMISSION DU FORMULAIRE (onSubmit)
  // ══════════════════════════════════════════
  describe('Soumission du formulaire (onSubmit)', () => {

    it('TC11 – ne devrait pas appeler login si formulaire invalide', () => {
      component.form.setValue({ email: '', password: '', rememberMe: false });
      component.onSubmit();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('TC12 – devrait appeler AuthService.login avec les bonnes données', () => {
      mockAuthService.login.mockReturnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
    });

    it('TC13 – devrait rediriger vers le dashboard après connexion réussie', () => {
      mockAuthService.login.mockReturnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      expect(mockRoleGuard.redirectToDashboard).toHaveBeenCalled();
    });

    it('TC14 – devrait effacer le message d\'erreur après connexion réussie', () => {
      mockAuthService.login.mockReturnValue(of({}));
      component.errorMessage = 'Erreur précédente';
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      expect(component.errorMessage).toBe('');
    });

    it('TC15 – devrait afficher un message d\'erreur si login échoue (HTTP 401)', () => {
      const error = new HttpErrorResponse({ status: 401, error: 'Invalid credentials' });
      mockAuthService.login.mockReturnValue(throwError(() => error));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'wrongpassword',
        rememberMe: false,
      });
      component.onSubmit();
      expect(component.errorMessage).toBe('Invalid credentials');
    });

    it('TC16 – isLoading doit être false après une erreur de connexion', () => {
      const error = new HttpErrorResponse({ status: 500, error: 'Server error' });
      mockAuthService.login.mockReturnValue(throwError(() => error));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      expect(component.isLoading).toBeFalsy();
    });

  });

  // ══════════════════════════════════════════
  // 4. MOT DE PASSE OUBLIÉ (onForgotPassword)
  // ══════════════════════════════════════════
  describe('Mot de passe oublié (onForgotPassword)', () => {

    it('TC17 – devrait afficher erreur si email vide', () => {
      component.form.setValue({ email: '', password: '', rememberMe: false });
      component.onForgotPassword();
      expect(component.errorMessage).toBe('Enter a valid email address to reset your password.');
    });

    it('TC18 – devrait afficher erreur si email mal formaté', () => {
      component.form.setValue({ email: 'notanemail', password: '', rememberMe: false });
      component.onForgotPassword();
      expect(component.errorMessage).toBe('Enter a valid email address to reset your password.');
    });

    it('TC19 – devrait appeler forgotPassword avec email valide', () => {
      mockAuthService.forgotPassword.mockReturnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: '',
        rememberMe: false,
      });
      component.onForgotPassword();
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({ email: 'admin@poulina.com' });
    });

    it('TC20 – devrait afficher message de succès après envoi email reset', () => {
      mockAuthService.forgotPassword.mockReturnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: '',
        rememberMe: false,
      });
      component.onForgotPassword();
      expect(component.infoMessage).toContain('lien de reinitialisation');
    });

    it('TC21 – devrait afficher erreur si l\'API forgotPassword échoue', () => {
      const error = new HttpErrorResponse({ status: 500, error: 'Server error' });
      mockAuthService.forgotPassword.mockReturnValue(throwError(() => error));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: '',
        rememberMe: false,
      });
      component.onForgotPassword();
      expect(component.errorMessage).toBeTruthy();
    });

  });
