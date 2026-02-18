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
import { UserStoryView } from './Component/Page/UserStory/user-story-view/user-story-view';
import { ProjectManager } from './Component/Page/Projet/project-manager/project-manager';
import { SprintManager } from './Component/Page/Sprint/sprint-manager/sprint-manager';
import { TeamManage } from './Component/Page/Team/team-manage/team-manage';
import { TaskManager } from './Component/Page/Task/task-manager/task-manager';
import { UserStoryManager } from './Component/Page/UserStory/user-story-manager/user-story-manager';

export const routes: Routes = [
    {path:'',component:Login },
    {path:'AdminDashboard', component:AdminDashboard},
    
    {path:'users', component:UserManage},
    {path:'Services', component:servicepage},

    {path:'ProjectView',component:ProjectView},
    {path:'SprintView',component:SprintView},
    {path:'TeamView',component:TeamView},
    {path:'TaskView',component:TaskView},
    {path:'UserStoryView',component:UserStoryView},

    {path:'ProjectManage',component:ProjectManager},
    {path:'SprintManage',component:SprintManager},
    {path:'TeamManage',component:TeamManage},
    {path:'TaskManage',component:TaskManager},
    {path:'UserStoryManage',component:UserStoryManager},

    {path:'ChefProjetDashboard', component:ChefProjetDashboard},
    {path:'EmployeeDashboard', component:EmployeeDashboard},
    {path:'ResponsableServiceDashboard', component:ResponsableServiceDashboard},
];