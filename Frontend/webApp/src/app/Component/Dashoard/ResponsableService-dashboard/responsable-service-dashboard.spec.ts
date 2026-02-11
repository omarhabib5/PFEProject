import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponsableServiceDashboard } from './responsable-service-dashboard';

describe('ResponsableServiceDashboard', () => {
  let component: ResponsableServiceDashboard;
  let fixture: ComponentFixture<ResponsableServiceDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsableServiceDashboard]
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
