import { Routes } from '@angular/router';
import { AdminDashboard } from './Component/Dashoard/admin-dashboard/admin-dashboard';
import { ChefProjetDashboard } from './Component/Dashoard/ChefProjet-dashboard/chef-projet-dashboard';
import { EmployeeDashboard } from './Component/Dashoard/Employee-dashboard/employee-dashboard';
import { ObserverDashboard } from './Component/Dashoard/Observateur-dashboard/observateur-dashboard';
import { ResponsableServiceDashboard } from './Component/Dashoard/ResponsableService-dashboard/responsable-service-dashboard';
import { Login } from './Component/Auth/login/login';
import { UserManage } from './Component/Page/user-manage/user-manage';
import { servicepage } from './Component/Page/service-page/service-page';
import { ProjectView } from './Component/Page/Projet/project-view/project-view';
import { SprintView } from './Component/Page/Sprint/sprint-view/sprint-view';
import { ProjectManager } from './Component/Page/Projet/project-manager/project-manager';
import { SprintManager } from './Component/Page/Sprint/sprint-manager/sprint-manager';
import { TeamManage } from './Component/Page/Team/team-manage/team-manage';
import { TaskManager } from './Component/Page/Task/task-manager/task-manager';
import { UserStoryManagerComponent } from './Component/Page/UserStory/user-story-manager/user-story-manager';
import { KanbanComponent } from './Component/kanban/kanban';
import { ResetPassword } from './Component/Auth/reset-password/reset-password';
import { AppRole } from './Component/Auth/model/auth.model';
import { authGuard, guestGuard, roleGuard } from './Component/Auth/Service/auth.guards';

export const routes: Routes = [
    { path: '', pathMatch: 'full', component: Login, canActivate: [guestGuard] },
    { path: 'login', component: Login, canActivate: [guestGuard] },
    { path: 'reset-password', component: ResetPassword, canActivate: [guestGuard] },
    {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: 'AdminDashboard',
                component: AdminDashboard,
                canActivate: [roleGuard],
                data: { roles: [AppRole.Admin] }
            },
            {
                path: 'ChefProjetDashboard',
                component: ChefProjetDashboard,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager] }
            },
            {
                path: 'EmployeeDashboard',
                component: EmployeeDashboard,
                canActivate: [roleGuard],
                data: { roles: [AppRole.Employee] }
            },
            {
                path: 'ObserverDashboard',
                component: ObserverDashboard,
                canActivate: [roleGuard],
                data: { roles: [AppRole.Observer] }
            },
            {
                path: 'ResponsableServiceDashboard',
                component: ResponsableServiceDashboard,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ServiceManager] }
            },

            { path: 'kanban', component: KanbanComponent },
          
            
            { path: 'users', component: UserManage },
            { path: 'Service', component: servicepage },

            { path: 'ProjectView', component: ProjectView },
            { path: 'SprintView', component: SprintView },
            { path: 'sprint/view/:id', component: SprintView },
           

            { path: 'ProjectManage', component: ProjectManager },
            { path: 'SprintManage', component: SprintManager },
            { path: 'sprint/manage/:projectId', component: SprintManager },
            { path: 'TeamManage', component: TeamManage },
            {
                path: 'TaskManage',
                component: TaskManager,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager, AppRole.ServiceManager] }
            },
            {
                path: 'task/manage',
                component: TaskManager,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager, AppRole.ServiceManager] }
            },
            {
                path: 'task/manage/:userStoryId',
                component: TaskManager,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager, AppRole.ServiceManager] }
            },
            {
                path: 'task/create/:userStoryId',
                component: TaskManager,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager, AppRole.ServiceManager] }
            },
            {
                path: 'task/edit/:id',
                component: TaskManager,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager, AppRole.ServiceManager] }
            },
            {
                path: 'UserStoryManage',
                component: UserStoryManagerComponent,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager] }
            },
            {
                path: 'userstory/manage/:sprintId',
                component: UserStoryManagerComponent,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager] }
            },
            {
                path: 'userstory/create/:sprintId',
                component: UserStoryManagerComponent,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager] }
            },
            {
                path: 'userstory/edit/:id',
                component: UserStoryManagerComponent,
                canActivate: [roleGuard],
                data: { roles: [AppRole.ProjectManager] }
            }
        ]
    },
    { path: '**', redirectTo: '' }
];

