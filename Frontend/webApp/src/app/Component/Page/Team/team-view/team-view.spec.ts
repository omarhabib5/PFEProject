import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamView } from './team-view';

describe('TeamView', () => {
  let component: TeamView;
  let fixture: ComponentFixture<TeamView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
