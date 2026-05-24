import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { AdminDashboard } from './admin-dashboard';

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

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    (component as any).initCharts = () => {};
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate project progress from tasks and user stories', () => {
    (component as any).projects = [
      { id: 1, name: 'Alpha', projectState: 2 },
      { id: 2, name: 'Beta', projectState: 1 },
      { id: 3, name: 'Gamma', projectState: 0 },
      { id: 4, name: 'Delta', projectState: 3 }
    ];

    (component as any).userStories = [
      { id: '11', projectId: 1, status: 'In Progress' },
      { id: '12', projectId: 2, status: 'Not started' },
      { id: '13', projectId: 2, status: 'Done', userStoryState: 4 }
    ];

    (component as any).tasks = [
      { id: 101, title: 'Task 1', status: 'done', userStoryId: 11 },
      { id: 102, title: 'Task 2', status: 'validated', userStoryId: 11 }
    ];

    expect((component as any).getProjectProgressPercent((component as any).projects[0])).toBe(100);
    expect((component as any).getProjectProgressPercent((component as any).projects[1])).toBe(50);
    expect((component as any).getProjectProgressPercent((component as any).projects[2])).toBe(10);
    expect((component as any).getProjectProgressPercent((component as any).projects[3])).toBe(100);

    expect((component as any).getProjectProgressCounts()).toEqual({
      veryLow: 1,
      low: 1,
      medium: 0,
      high: 2
    });
  });
});