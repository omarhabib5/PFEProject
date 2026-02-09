import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChefProjetDashboard } from './chef-projet-dashboard';

describe('ChefProjetDashboard', () => {
  let component: ChefProjetDashboard;
  let fixture: ComponentFixture<ChefProjetDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChefProjetDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChefProjetDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
