import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStoryManager } from './user-story-manager';

describe('UserStoryManager', () => {
  let component: UserStoryManager;
  let fixture: ComponentFixture<UserStoryManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStoryManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStoryManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
