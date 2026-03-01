import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStoryManagerComponent } from './user-story-manager';

describe('UserStoryManager', () => {
  let component: UserStoryManagerComponent;
  let fixture: ComponentFixture<UserStoryManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStoryManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStoryManagerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
