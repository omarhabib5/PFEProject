import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStoryViewComponent } from './user-story-view';

describe('UserStoryViewComponent', () => {
  let component: UserStoryViewComponent;
  let fixture: ComponentFixture<UserStoryViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStoryViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStoryViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
