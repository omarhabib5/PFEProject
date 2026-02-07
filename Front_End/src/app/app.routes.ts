import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { ProfileComponent } from './auth/profile.component';
import { RegisterComponent } from './auth/register.component';
import { KanbanComponent } from './kanban.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'register', component: RegisterComponent },
	{ path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
	{ path: '', component: KanbanComponent, canActivate: [AuthGuard] }
];
