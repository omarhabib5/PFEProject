import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { TaskManager } from './task-manager';

const activatedRouteMock = {
  params: of({}),
  queryParams: of({}),
  queryParamMap: of(convertToParamMap({})),
  snapshot: { queryParamMap: convertToParamMap({}) },
};

const routerMock = {
  events: of({}),
  createUrlTree: () => ({}),
  serializeUrl: () => '',
  navigate: () => Promise.resolve(true),
  navigateByUrl: () => Promise.resolve(true),
  url: '/',
  parseUrl: () => ({ queryParams: {} }),
};

describe('TaskManager', () => {
  let component: TaskManager;
  let fixture: ComponentFixture<TaskManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskManager],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
