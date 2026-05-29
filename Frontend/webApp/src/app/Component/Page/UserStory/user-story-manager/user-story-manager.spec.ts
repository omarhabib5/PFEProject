import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { UserStoryManagerComponent } from './user-story-manager';
import { SprintService } from '../../Sprint/Service/SprintService';
import { UserStoryService } from '../Service/UserStoryService';
import { TokenService } from '../../../Auth/Service/token.service';

const activatedRouteMock = {
  params: of({}),
  queryParams: of({}),
  queryParamMap: of(convertToParamMap({})),
  snapshot: { queryParamMap: convertToParamMap({}) },
};

const routerMock = {
  navigate: () => Promise.resolve(true),
  navigateByUrl: () => Promise.resolve(true),
  url: '/',
  parseUrl: () => ({ queryParams: {} }),
};

const userStoryServiceMock = {
  getBySprintId: () => of([]),
  create: () => of(1),
  update: () => of(void 0),
  delete: () => of(void 0),
};

const sprintServiceMock = {
  getSprintById: () => of({ id: 1, name: 'Sprint 1', projectId: 1 }),
};

const tokenServiceMock = {
  getUserRole: () => 'admin',
};

describe('UserStoryManagerComponent', () => {
  let component: UserStoryManagerComponent;
  let fixture: ComponentFixture<UserStoryManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStoryManagerComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
        { provide: UserStoryService, useValue: userStoryServiceMock },
        { provide: SprintService, useValue: sprintServiceMock },
        { provide: TokenService, useValue: tokenServiceMock },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStoryManagerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
