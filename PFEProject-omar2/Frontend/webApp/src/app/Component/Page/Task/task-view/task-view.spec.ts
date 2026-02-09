import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskView } from './task-view';

describe('TaskView', () => {
  let component: TaskView;
  let fixture: ComponentFixture<TaskView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
