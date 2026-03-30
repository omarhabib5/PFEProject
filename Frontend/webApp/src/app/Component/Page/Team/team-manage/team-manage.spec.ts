import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamManage } from './team-manage';

describe('TeamManage', () => {
  let component: TeamManage;
  let fixture: ComponentFixture<TeamManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamManage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamManage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
