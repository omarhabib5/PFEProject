import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserManage } from './user-manage';

describe('UserManage', () => {
  let component: UserManage;
  let fixture: ComponentFixture<UserManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserManage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
