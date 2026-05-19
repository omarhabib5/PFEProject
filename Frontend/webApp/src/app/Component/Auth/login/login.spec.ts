import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

import 'jasmine';

import { Login } from './login';
import { AuthService } from '../Service/auth.service';
import { RoleGuard } from '../Service/role.guard';

const mockAuthService = {
  isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
  login: jasmine.createSpy('login').and.returnValue(of({})),
  forgotPassword: jasmine.createSpy('forgotPassword').and.returnValue(of({})),
};

const mockRoleGuard = {
  redirectToDashboard: jasmine.createSpy('redirectToDashboard'),
};

const mockRouter = {
  navigate: jasmine.createSpy('navigate'),
  navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
  url: '/',
  parseUrl: jasmine.createSpy('parseUrl').and.returnValue({ queryParams: {} }),
};


  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    
    mockAuthService.isAuthenticated.calls.reset();
    mockAuthService.login.calls.reset();
    mockAuthService.forgotPassword.calls.reset();
    mockRoleGuard.redirectToDashboard.calls.reset();

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
      mockAuthService.isAuthenticated.and.returnValue(true);
      component.ngOnInit();
      expect(mockRoleGuard.redirectToDashboard).toHaveBeenCalled();
    });

    it('TC04 – ne devrait pas rediriger si non authentifié', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
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
      mockAuthService.login.and.returnValue(of({}));
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

    it('TC13 – devrait rediriger vers le dashboard après connexion réussie', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      tick();
      expect(mockRoleGuard.redirectToDashboard).toHaveBeenCalled();
    }));

    it('TC14 – devrait effacer le message d\'erreur après connexion réussie', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({}));
      component.errorMessage = 'Erreur précédente';
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      tick();
      expect(component.errorMessage).toBe('');
    }));

    it('TC15 – devrait afficher un message d\'erreur si login échoue (HTTP 401)', fakeAsync(() => {
      const error = new HttpErrorResponse({ status: 401, error: 'Invalid credentials' });
      mockAuthService.login.and.returnValue(throwError(() => error));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'wrongpassword',
        rememberMe: false,
      });
      component.onSubmit();
      tick();
      expect(component.errorMessage).toBe('Invalid credentials');
    }));

    it('TC16 – isLoading doit être false après une erreur de connexion', fakeAsync(() => {
      const error = new HttpErrorResponse({ status: 500, error: 'Server error' });
      mockAuthService.login.and.returnValue(throwError(() => error));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: 'Admin@123',
        rememberMe: false,
      });
      component.onSubmit();
      tick();
      expect(component.isLoading).toBeFalse();
    }));

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

    it('TC19 – devrait appeler forgotPassword avec email valide', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: '',
        rememberMe: false,
      });
      component.onForgotPassword();
      tick();
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({ email: 'admin@poulina.com' });
    }));

    it('TC20 – devrait afficher message de succès après envoi email reset', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(of({}));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: '',
        rememberMe: false,
      });
      component.onForgotPassword();
      tick();
      expect(component.infoMessage).toContain('lien de reinitialisation');
    }));

    it('TC21 – devrait afficher erreur si l\'API forgotPassword échoue', fakeAsync(() => {
      const error = new HttpErrorResponse({ status: 500, error: 'Server error' });
      mockAuthService.forgotPassword.and.returnValue(throwError(() => error));
      component.form.setValue({
        email: 'admin@poulina.com',
        password: '',
        rememberMe: false,
      });
      component.onForgotPassword();
      tick();
      expect(component.errorMessage).toBeTruthy();
    }));

  });
