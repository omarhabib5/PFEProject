import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStoryView } from './user-story-view';

describe('UserStoryView', () => {
  let component: UserStoryView;
  let fixture: ComponentFixture<UserStoryView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStoryView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStoryView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
