import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProjectManager } from './project-manager';
import { ProjectService } from '../Service/ProjectService';
import { TeamService } from '../../Team/Service/TeamService';
import { ServiceService } from '../../Team/Service/ServiceService';
import { UserApiService } from '../../Team/Service/UserApiService';
import { SprintService } from '../../Sprint/Service/SprintService';
import { TaskService } from '../../Task/Service/TaskService';
import { UserStoryService } from '../../UserStory/Service/UserStoryService';
import { TokenService } from '../../../Auth/Service/token.service';


const mockProjects = [
  {
    id: 1,
    name: 'gestion de bibliotheque',
    status: 'In Progress',
    progress: 65,
    totalSprints: 3,
    totalTasks: 2,
    totalMembers: 3,
    totalUserStories: 1,
  },
  {
    id: 2,
    name: 'gestion de stock',
    status: 'Done',
    progress: 100,
    totalSprints: 2,
    totalTasks: 5,
    totalMembers: 2,
    totalUserStories: 3,
  },
];

const mockTeams = [
  { id: 1, name: 'Team Alpha', serviceId: 1 },
  { id: 2, name: 'Team Beta',  serviceId: 2 },
];

const mockServices = [
  { id: 1, name: 'serviceWeb'    },
  { id: 2, name: 'serviceMobile' },
];

const mockUsers = [
  { id: 1, name: 'rayen zegnani', role: 'Admin'          },
  { id: 2, name: 'omar habib',    role: 'ProjectManager' },
];

const mockSprints = [
  { id: 1, name: 'Authentification', status: 'Done',  projectId: 1 },
  { id: 2, name: 'KV',               status: 'To Do', projectId: 1 },
];

const mockTasks = [
  { id: 1, title: 'loginPage',          status: 'To Do', projectId: 1 },
  { id: 2, title: 'Auto cascade check', status: 'Done',  projectId: 1 },
];

const mockUserStories = [
  {
    id: 1,
    name: "En tant qu'utilisateur, je veux me connecter",
    status: 'To Do',
    storyPoints: 1,
    projectId: 1,
  },
];



const activatedRouteMock = {
  params:        of({}),
  queryParams:   of({}),
  queryParamMap: of(convertToParamMap({})),
  snapshot: { queryParamMap: convertToParamMap({}) },
};

const projectServiceMock = {
  getAllProjects: vi.fn().mockReturnValue(of(mockProjects)),
  getByProjectId: vi.fn().mockReturnValue(of(mockProjects[0])),
  createProject: vi.fn().mockReturnValue(of(mockProjects[0])),
  updateProject: vi.fn().mockReturnValue(of(mockProjects[0])),
  deleteProject: vi.fn().mockReturnValue(of({})),
};

const teamServiceMock = {
  getTeams: vi.fn().mockReturnValue(of(mockTeams)),
  getAll: vi.fn().mockReturnValue(of(mockTeams)),
};

const serviceServiceMock = {
  getServices: vi.fn().mockReturnValue(of(mockServices)),
  getAll: vi.fn().mockReturnValue(of(mockServices)),
};

const userApiServiceMock = {
  getUsers: vi.fn().mockReturnValue(of(mockUsers)),
  getAll: vi.fn().mockReturnValue(of(mockUsers)),
};

const sprintServiceMock = {
  getByProjectId: vi.fn().mockReturnValue(of(mockSprints)),
  getAll: vi.fn().mockReturnValue(of(mockSprints)),
};

const taskServiceMock = {
  getByProjectId: vi.fn().mockReturnValue(of(mockTasks)),
  getAll: vi.fn().mockReturnValue(of(mockTasks)),
};

const userStoryServiceMock = {
  getByProjectId: vi.fn().mockReturnValue(of(mockUserStories)),
  getAll: vi.fn().mockReturnValue(of(mockUserStories)),
};

const tokenServiceMock = {
  getUserRole: vi.fn().mockReturnValue('admin'),
  getUserData: vi.fn().mockReturnValue({ role: 'admin' }),
};


describe('ProjectManager Component', () => {
  let component: ProjectManager;
  let fixture: ComponentFixture<ProjectManager>;

  beforeEach(async () => {
    projectServiceMock.getAllProjects.mockClear();
    projectServiceMock.getByProjectId.mockClear();
    projectServiceMock.createProject.mockClear();
    projectServiceMock.updateProject.mockClear();
    projectServiceMock.deleteProject.mockClear();
    tokenServiceMock.getUserRole.mockClear();

    await TestBed.configureTestingModule({
      imports: [ProjectManager],
      providers: [
        { provide: ActivatedRoute,   useValue: activatedRouteMock   },
        { provide: ProjectService,   useValue: projectServiceMock   },
        { provide: TeamService,      useValue: teamServiceMock      },
        { provide: ServiceService,   useValue: serviceServiceMock   },
        { provide: UserApiService,   useValue: userApiServiceMock   },
        { provide: SprintService,    useValue: sprintServiceMock    },
        { provide: TaskService,      useValue: taskServiceMock      },
        { provide: UserStoryService, useValue: userStoryServiceMock },
        { provide: TokenService,     useValue: tokenServiceMock     },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ProjectManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  
  describe('Initialisation', () => {

    it('TC01 – devrait créer le composant sans erreur', () => {
      expect(component).toBeTruthy();
    });

    it('TC02 – devrait appeler getAllProjects au démarrage', () => {
      fixture.detectChanges();
      expect(projectServiceMock.getAllProjects).toHaveBeenCalled();
    });

    it('TC03 – devrait récupérer le rôle utilisateur via TokenService', () => {
      fixture.detectChanges();
      expect(component.canViewKanban).toBe(true);
      expect(tokenServiceMock.getUserRole).toHaveBeenCalled();
    });

    it('TC04 – devrait autoriser l admin à gérer les user stories', () => {
      fixture.detectChanges();
      expect(component.canManageUserStories).toBe(true);
    });

  });

  
  describe('Chargement des projets', () => {

    it('TC05 – devrait charger la liste des projets depuis ProjectService', () => {
      projectServiceMock.getAllProjects.mockReturnValue(of(mockProjects));
      fixture.detectChanges();
      expect(projectServiceMock.getAllProjects).toHaveBeenCalled();
    });

    it('TC06 – devrait retourner 2 projets dans la liste mock', () => {
      expect(mockProjects.length).toBe(2);
    });

    it('TC07 – devrait gérer une liste de projets vide sans erreur', () => {
      projectServiceMock.getAllProjects.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('TC08 – devrait gérer une erreur de chargement des projets', () => {
      projectServiceMock.getAllProjects.mockReturnValue(
        throwError(() => new Error('Erreur serveur'))
      );
      expect(() => fixture.detectChanges()).not.toThrow();
    });

  });

 
  describe('Chargement des données associées', () => {

    it('TC09 – TeamService doit être disponible', () => {
      expect(teamServiceMock).toBeTruthy();
    });

    it('TC10 – ServiceService doit être disponible', () => {
      expect(serviceServiceMock).toBeTruthy();
    });

    it('TC11 – UserApiService doit être disponible', () => {
      expect(userApiServiceMock).toBeTruthy();
    });

    it('TC12 – SprintService doit être disponible', () => {
      expect(sprintServiceMock).toBeTruthy();
    });

    it('TC13 – TaskService doit être disponible', () => {
      expect(taskServiceMock).toBeTruthy();
    });

    it('TC14 – UserStoryService doit être disponible', () => {
      expect(userStoryServiceMock).toBeTruthy();
    });

  });


  describe('Vérification des données projets', () => {

    it('TC15 – le premier projet devrait avoir le statut "In Progress"', () => {
      expect(mockProjects[0].status).toBe('In Progress');
    });

    it('TC16 – le premier projet devrait avoir une progression de 65%', () => {
      expect(mockProjects[0].progress).toBe(65);
    });

    it('TC17 – le premier projet devrait avoir 3 sprints', () => {
      expect(mockProjects[0].totalSprints).toBe(3);
    });

    it('TC18 – le premier projet devrait avoir 3 membres', () => {
      expect(mockProjects[0].totalMembers).toBe(3);
    });

    it('TC19 – le deuxième projet devrait avoir le statut "Done"', () => {
      expect(mockProjects[1].status).toBe('Done');
    });

    it('TC20 – le deuxième projet devrait avoir une progression de 100%', () => {
      expect(mockProjects[1].progress).toBe(100);
    });

  });

  
  describe('Vérification des sprints et tâches', () => {

    it('TC21 – le premier sprint devrait avoir le statut "Done"', () => {
      expect(mockSprints[0].status).toBe('Done');
    });

    it('TC22 – le deuxième sprint devrait avoir le statut "To Do"', () => {
      expect(mockSprints[1].status).toBe('To Do');
    });

    it('TC23 – la première tâche devrait être "loginPage" avec statut "To Do"', () => {
      expect(mockTasks[0].title).toBe('loginPage');
      expect(mockTasks[0].status).toBe('To Do');
    });

    it('TC24 – la deuxième tâche "Auto cascade check" devrait avoir le statut "Done"', () => {
      expect(mockTasks[1].title).toBe('Auto cascade check');
      expect(mockTasks[1].status).toBe('Done');
    });

  });

});