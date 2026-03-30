import { ComponentFixture, TestBed } from '@angular/core/testing';

import { servicepage } from './service-page';

describe('ServicePage', () => {
  let component: servicepage;
  let fixture: ComponentFixture<servicepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [servicepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(servicepage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });});