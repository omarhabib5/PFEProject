import { Routes } from '@angular/router';
import { AdminDashboard } from './Component/Dashoard/admin-dashboard/admin-dashboard';
import { ChefProjetDashboard } from './Component/Dashoard/ChefProjet-dashboard/chef-projet-dashboard';
import { EmployeeDashboard } from './Component/Dashoard/Employee-dashboard/employee-dashboard';
import { ResponsableServiceDashboard } from './Component/Dashoard/ResponsableService-dashboard/responsable-service-dashboard';
import { Login } from './Component/Auth/login/login';
import { UserManage } from './Component/Page/user-manage/user-manage';
import { ServicePage } from './Component/Page/service-page/service-page';
import { ProjectView } from './Component/Page/Projet/project-view/project-view';
import { SprintView } from './Component/Page/Sprint/sprint-view/sprint-view';
import { TeamView } from './Component/Page/Team/team-view/team-view';
export const routes: Routes = [

    {path:'',component:Login },
    {path:'AdminDashboard', component:AdminDashboard , 
        children:[
        {path:'users', component:UserManage},
        {path:'Service', component:ServicePage , },
        {path:'ProjectView',component:ProjectView},
        {path:'SprintView',component:SprintView},
        {path:'TeamView',component:TeamView},
        {path:'TaskView'}
        

        ]},
    {path:'ChefProjetDashboard', component:ChefProjetDashboard},
    {path:'EmployeeDashboard', component:EmployeeDashboard},
    {path:'ResponsableServiceDashboard', component:ResponsableServiceDashboard},

];
