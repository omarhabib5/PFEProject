import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { EmployeeDashboard } from './employee-dashboard';

const routerMock = {
  events: of({}),
  navigate: () => Promise.resolve(true),
  navigateByUrl: () => Promise.resolve(true),
  url: '/',
  parseUrl: () => ({ queryParams: {} }),
};

describe('EmployeeDashboard', () => {
  let component: EmployeeDashboard;
  let fixture: ComponentFixture<EmployeeDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDashboard],
      providers: [{ provide: Router, useValue: routerMock }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
