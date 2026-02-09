import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SprintView } from './sprint-view';

describe('SprintView', () => {
  let component: SprintView;
  let fixture: ComponentFixture<SprintView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SprintView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SprintView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
