import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { Backlog } from './backlog';

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

describe('Backlog', () => {
  let component: Backlog;
  let fixture: ComponentFixture<Backlog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Backlog],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Backlog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
