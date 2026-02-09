import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SprintManager } from './sprint-manager';

describe('SprintManager', () => {
  let component: SprintManager;
  let fixture: ComponentFixture<SprintManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SprintManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SprintManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
