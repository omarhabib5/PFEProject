import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { ResponsableServiceDashboard } from './responsable-service-dashboard';

const routerMock = {
  events: of({}),
  navigate: () => Promise.resolve(true),
  navigateByUrl: () => Promise.resolve(true),
  url: '/',
  parseUrl: () => ({ queryParams: {} }),
};

describe('ResponsableServiceDashboard', () => {
  let component: ResponsableServiceDashboard;
  let fixture: ComponentFixture<ResponsableServiceDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsableServiceDashboard],
      providers: [{ provide: Router, useValue: routerMock }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResponsableServiceDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
