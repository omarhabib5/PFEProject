import { Routes } from '@angular/router';
import { AdminDashboard } from './Component/Dashoard/admin-dashboard/admin-dashboard';
import { ChefProjetDashboard } from './Component/Dashoard/ChefProjet-dashboard/chef-projet-dashboard';
import { EmployeeDashboard } from './Component/Dashoard/Employee-dashboard/employee-dashboard';
import { ResponsableServiceDashboard } from './Component/Dashoard/ResponsableService-dashboard/responsable-service-dashboard';
import { Login } from './Component/Auth/login/login';
import { UserManage } from './Component/Page/user-manage/user-manage';
import { servicepage } from './Component/Page/service-page/service-page';
import { ProjectView } from './Component/Page/Projet/project-view/project-view';
import { SprintView } from './Component/Page/Sprint/sprint-view/sprint-view';
import { TeamView } from './Component/Page/Team/team-view/team-view';
import { TaskView } from './Component/Page/Task/task-view/task-view';
import { UserStoryViewComponent } from './Component/Page/UserStory/user-story-view/user-story-view';
import { ProjectManager } from './Component/Page/Projet/project-manager/project-manager';
import { SprintManager } from './Component/Page/Sprint/sprint-manager/sprint-manager';
import { TeamManage } from './Component/Page/Team/team-manage/team-manage';
import { TaskManager } from './Component/Page/Task/task-manager/task-manager';
import { UserStoryManagerComponent } from './Component/Page/UserStory/user-story-manager/user-story-manager';
import { KanbanComponent } from './Component/kanban/kanban';
import { AppRole } from './Component/Auth/model/auth.model';
import { authGuard, guestGuard, roleGuard } from './Component/Auth/Service/auth.guards';

export const routes: Routes = [
    { path: '', pathMatch: 'full', component: Login, canActivate: [guestGuard] },
    { path: 'login', component: Login, canActivate: [guestGuard] },
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
            { path: 'TeamView', component: TeamView },
            { path: 'TaskView', component: TaskView },
            { path: 'task/view/:id', component: TaskView },
            { path: 'UserStoryView', component: UserStoryViewComponent },
            { path: 'userstory/view/:id', component: UserStoryViewComponent },

            { path: 'ProjectManage', component: ProjectManager },
            { path: 'SprintManage', component: SprintManager },
            { path: 'sprint/manage/:projectId', component: SprintManager },
            { path: 'TeamManage', component: TeamManage },
            { path: 'TaskManage', component: TaskManager },
            { path: 'task/manage', component: TaskManager },
            { path: 'task/manage/:userStoryId', component: TaskManager },
            { path: 'task/create/:userStoryId', component: TaskManager },
            { path: 'task/edit/:id', component: TaskManager },
            { path: 'UserStoryManage', component: UserStoryManagerComponent },
            { path: 'userstory/manage/:sprintId', component: UserStoryManagerComponent },
            { path: 'userstory/create/:sprintId', component: UserStoryManagerComponent },
            { path: 'userstory/edit/:id', component: UserStoryManagerComponent }
        ]
    },
    { path: '**', redirectTo: '' }
];

